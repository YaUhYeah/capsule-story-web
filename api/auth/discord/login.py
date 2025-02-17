from flask import Flask, redirect, request, session, jsonify
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'your-secret-key')

DISCORD_CLIENT_ID = os.getenv('DISCORD_CLIENT_ID')
DISCORD_CLIENT_SECRET = os.getenv('DISCORD_CLIENT_SECRET')
DISCORD_REDIRECT_URI = os.getenv('DISCORD_REDIRECT_URI', 'http://localhost:53202/api/auth/discord/callback')
DISCORD_API_ENDPOINT = 'https://discord.com/api/v10'

@app.route('/api/auth/discord/login')
def discord_login():
    return redirect(f'https://discord.com/api/oauth2/authorize?client_id={DISCORD_CLIENT_ID}'
                   f'&redirect_uri={DISCORD_REDIRECT_URI}&response_type=code&scope=identify%20email')

@app.route('/api/auth/discord/callback')
def discord_callback():
    error = request.args.get('error')
    if error:
        return jsonify({'error': 'Access denied'}), 401

    code = request.args.get('code')
    data = {
        'client_id': DISCORD_CLIENT_ID,
        'client_secret': DISCORD_CLIENT_SECRET,
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': DISCORD_REDIRECT_URI,
        'scope': 'identify email'
    }
    
    # Exchange code for access token
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    token_response = requests.post(f'{DISCORD_API_ENDPOINT}/oauth2/token', data=data, headers=headers)
    
    if token_response.status_code != 200:
        return jsonify({'error': 'Failed to get access token'}), 500
        
    tokens = token_response.json()
    
    # Get user info
    headers = {'Authorization': f'Bearer {tokens["access_token"]}'}
    user_response = requests.get(f'{DISCORD_API_ENDPOINT}/users/@me', headers=headers)
    
    if user_response.status_code != 200:
        return jsonify({'error': 'Failed to get user info'}), 500
        
    user_data = user_response.json()
    
    # Store user info in session
    session['user'] = {
        'id': user_data['id'],
        'username': user_data['username'],
        'email': user_data.get('email'),
        'avatar': user_data.get('avatar')
    }
    
    # Redirect to frontend with success
    return redirect('/profile')

@app.route('/api/auth/logout')
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/auth/user')
def get_user():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    return jsonify(session['user'])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=53202)