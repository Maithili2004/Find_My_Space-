from flask import Flask, request, jsonify
import razorpay
import firebase_admin
from firebase_admin import credentials, firestore
import smtplib
from email.mime.text import MIMEText
from flask_cors import CORS
import os
import sys
from firebase_admin import auth as firebase_auth

# Determine service account path (allow env override), default to repo-relative path
base_dir = os.path.dirname(__file__)
sa_path = os.environ.get("SERVICE_ACCOUNT_PATH") or os.path.join(base_dir, "serviceAccountKey.json")
if not os.path.isfile(sa_path):
    print(f"ERROR: service account file not found at '{sa_path}'. Place your serviceAccountKey.json there or set SERVICE_ACCOUNT_PATH env var.")
    sys.exit(1)

cred = credentials.Certificate(sa_path)
firebase_admin.initialize_app(cred)

app = Flask(__name__)
CORS(app)
db = firestore.client()

# Read Razorpay credentials from env vars if present, otherwise fall back to keys in the file
RAZORPAY_KEY = os.environ.get("RAZORPAY_KEY", "rzp_test_R7uXW1hjYwmS5a")
RAZORPAY_SECRET = os.environ.get("RAZORPAY_SECRET", "YU8Dq070MZcUAlys7ex4HFat")
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY, RAZORPAY_SECRET))

@app.route('/payment/webhook', methods=['POST'])
def payment_webhook():
    payload = request.json
    # Verify signature
    try:
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': payload['razorpay_order_id'],
            'razorpay_payment_id': payload['razorpay_payment_id'],
            'razorpay_signature': payload['razorpay_signature']
        })
        # Update payment and booking status in Firestore
        payment_ref = db.collection('payments').where('orderId', '==', payload['razorpay_order_id']).get()
        for doc_ref in payment_ref:
            doc_ref.reference.update({'status': 'success'})
            bookingId = doc_ref.to_dict()['bookingId']
            db.collection('bookings').document(bookingId).update({'paymentStatus': 'paid-escrow'})
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/createOrder', methods=['POST'])
def create_order():
    data = request.json
    amount = data['amount']
    order = razorpay_client.order.create({
        "amount": amount,
        "currency": "INR",
        "payment_capture": 1
    })
    return jsonify({"order_id": order["id"]})
    
@app.route('/releasePayout', methods=['POST'])
def release_payout():
    data = request.json
    bookingId = data['bookingId']
    commission = data.get('commission', 0.15)  # Default 15% commission

    # Update booking/payment status
    db.collection('bookings').document(bookingId).update({
        'paymentStatus': 'paid-released',
        'status': 'released'
    })
    payment_query = db.collection('payments').where('bookingId', '==', bookingId).get()
    for doc_ref in payment_query:
        doc_ref.reference.update({'status': 'released', 'commission': commission})

    # Fetch provider and user email from Firestore
    booking_ref = db.collection('bookings').document(bookingId).get()
    if booking_ref.exists:
        booking_data = booking_ref.to_dict()
        provider_id = booking_data.get('providerId')
        user_email = booking_data.get('userEmail', 'user@example.com')
        provider_email = 'provider@example.com'
        if provider_id:
            provider_ref = db.collection('providers').document(provider_id).get()
            if provider_ref.exists:
                provider_email = provider_ref.to_dict().get('email', provider_email)
        # Send notification emails
        send_email(provider_email, "Payout Released", f"Payout for booking {bookingId} has been released.")
        send_email(user_email, "Booking Completed", f"Your booking {bookingId} is completed.")

    return jsonify({'success': True})


@app.route('/api/bookings/mark-parked', methods=['POST'])
def mark_parked_and_payout():
    """Called by provider app when provider scans QR/OTP and marks vehicle parked.
    Verifies Firebase ID token, checks booking and OTP, marks payoutTriggered atomically,
    and triggers payout via Razorpay Payouts (if enabled)."""
    try:
        id_token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            id_token = auth_header.split(' ', 1)[1]
        data = request.json or {}
        booking_id = data.get('bookingId')
        otp = data.get('otp')

        if not id_token or not booking_id or not otp:
            return jsonify({'success': False, 'error': 'Missing token, bookingId or otp'}), 400

        decoded = firebase_auth.verify_id_token(id_token)
        provider_uid = decoded.get('uid')

        booking_ref = db.collection('bookings').document(booking_id)
        booking_doc = booking_ref.get()
        if not booking_doc.exists:
            return jsonify({'success': False, 'error': 'Booking not found'}), 404
        booking = booking_doc.to_dict()

        # Verify provider owns this booking
        if booking.get('providerId') != provider_uid:
            return jsonify({'success': False, 'error': 'Not authorized for this booking'}), 403

        # Verify OTP matches
        if booking.get('otp') != otp:
            return jsonify({'success': False, 'error': 'Invalid OTP'}), 400

        # Run transaction to mark payoutTriggered and set checked-in state
        def tx_update(tx):
            snap = booking_ref.get(transaction=tx)
            doc = snap.to_dict()
            if not doc:
                raise Exception('Booking disappeared')
            if doc.get('payoutTriggered'):
                # idempotent: already triggered
                return {'status': 'already_triggered'}
            # Only allow if booking status is appropriate
            if doc.get('status') in ['cancelled', 'vacated', 'rejected']:
                raise Exception('Invalid booking status for payout')
            tx.update(booking_ref, {
                'payoutTriggered': True,
                'status': 'checked-in',
                'paymentStatus': doc.get('paymentStatus') or 'paid-escrow',
                'payoutTriggeredAt': firestore.SERVER_TIMESTAMP
            })
            return {'status': 'triggered'}

        try:
            result = db.run_transaction(lambda tx: tx_update(tx))
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 400

        if result.get('status') == 'already_triggered':
            return jsonify({'success': True, 'message': 'Payout already triggered (idempotent)'}), 200

        # Create a payment record to track payout
        payment_rec = {
            'bookingId': booking_id,
            'providerId': provider_uid,
            'amount': booking.get('totalCost', 0),
            'status': 'payout_pending',
            'createdAt': firestore.SERVER_TIMESTAMP
        }
        payment_ref = db.collection('payments').document()
        payment_ref.set(payment_rec)

        # Attempt payout if provider has payout details and payouts enabled
        payouts_enabled = os.environ.get('RAZORPAY_PAYOUTS_ENABLED') == '1'
        provider_doc = db.collection('users').document(provider_uid).get()
        provider_data = provider_doc.to_dict() if provider_doc.exists else {}
        payout_details = provider_data.get('payoutDetails') if provider_data else None

        if not payouts_enabled:
            # Not enabled: mark payment as pending manual release
            payment_ref.update({'status': 'manual_release_required'})
            # Optionally send notification to admin/provider here
            return jsonify({'success': True, 'message': 'Payout queued for manual release'}), 200

        if not payout_details:
            payment_ref.update({'status': 'no_payout_details'})
            return jsonify({'success': False, 'error': 'Provider payout details missing'}), 400

        # Example Razorpay Payouts payload - adjust according to Razorpay requirements
        try:
            payout_payload = {
                'account_number': payout_details.get('account'),
                'fund_account': {
                    'account_type': 'bank_account',
                    'bank_account': {
                        'name': payout_details.get('name'),
                        'ifsc': payout_details.get('ifsc'),
                        'account_number': payout_details.get('account')
                    }
                },
                'amount': int((booking.get('totalCost', 0) or 0) * 100),
                'currency': 'INR',
                'mode': 'IMPS',
                'purpose': 'payout',
                'queue_if_low_balance': True
            }
            # The actual create method depends on razorpay SDK; using generic client call
            payout_resp = razorpay_client.payout.create(payout_payload)
            # Update payment record and booking on success
            payment_ref.update({'status': 'released', 'payoutResponse': payout_resp})
            booking_ref.update({'paymentStatus': 'paid-released', 'payoutId': payout_resp.get('id')})
            # Notify provider via email
            send_email(provider_data.get('email', ''), 'Payout Released', f'Payout for booking {booking_id} has been released.')
            return jsonify({'success': True, 'payout': payout_resp}), 200
        except Exception as payout_err:
            # Mark payout failed and keep payoutTriggered to avoid accidental duplicates
            payment_ref.update({'status': 'payout_failed', 'error': str(payout_err)})
            return jsonify({'success': False, 'error': 'Payout failed', 'details': str(payout_err)}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/payments/create', methods=['POST'])
def create_payment():
    """
    Server-side payment creation endpoint.
    Client calls this after Razorpay checkout succeeds.
    Uses Admin SDK to write payment doc (bypasses client rules).
    """
    try:
        data = request.json
        id_token = data.get('idToken')
        booking_id = data.get('bookingId')
        razorpay_payment_id = data.get('razorpayPaymentId')
        razorpay_order_id = data.get('razorpayOrderId')
        razorpay_signature = data.get('razorpaySignature')
        amount = data.get('amount')
        
        if not all([id_token, booking_id, razorpay_payment_id, razorpay_order_id, amount]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        # Verify ID token to get user UID
        try:
            decoded = firebase_auth.verify_id_token(id_token)
            uid = decoded['uid']
        except Exception as e:
            return jsonify({'success': False, 'error': 'Invalid ID token', 'details': str(e)}), 401
        
        # Get booking to extract providerId
        booking_ref = db.collection('bookings').document(booking_id)
        booking_doc = booking_ref.get()
        if not booking_doc.exists:
            return jsonify({'success': False, 'error': 'Booking not found'}), 404
        
        booking_data = booking_doc.to_dict()
        if booking_data.get('userId') != uid:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
        # Create payment doc using Admin SDK (bypasses rules)
        payment_data = {
            'bookingId': booking_id,
            'userId': uid,
            'providerId': booking_data.get('providerId'),
            'paymentId': razorpay_payment_id,
            'orderId': razorpay_order_id,
            'signature': razorpay_signature,
            'status': 'created',
            'method': 'razorpay',
            'amount': float(amount),
            'createdAt': firestore.SERVER_TIMESTAMP
        }
        
        payment_ref = db.collection('payments').document()
        payment_ref.set(payment_data)
        
        return jsonify({
            'success': True,
            'paymentId': payment_ref.id,
            'message': 'Payment created successfully'
        }), 201
    except Exception as e:
        print(f"Error creating payment: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

def send_email(to_email, subject, body):
    # Replace with your SMTP details
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    smtp_user = "maithilic2004@gmail.com"
    smtp_pass = "otyb nuee gkpn wwoq"
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = to_email
    with smtplib.SMTP(smtp_server, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, to_email, msg.as_string())

if __name__ == "__main__":
    # Bind to all interfaces for local network testing; change port if needed
    app.run(debug=True, host="0.0.0.0", port=5000)