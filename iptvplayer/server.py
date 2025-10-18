#!/usr/bin/env python3
"""
Simple HTTP server for testing the IPTV Player web app locally.
Run this script and open http://localhost:8000/login.html in your browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def main():
    # Change to the directory containing this script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    Handler = CORSHTTPRequestHandler
    
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"🚀 IPTV Player server starting...")
            print(f"📡 Server running at: http://localhost:{PORT}")
            print(f"🔗 Login page: http://localhost:{PORT}/login.html")
            print(f"📱 Direct access: http://localhost:{PORT}/index.html")
            print(f"\n⚡ Press Ctrl+C to stop the server")
            
            # Try to open the browser automatically
            try:
                webbrowser.open(f'http://localhost:{PORT}/login.html')
                print(f"🌐 Browser opened automatically")
            except:
                print(f"🌐 Please open http://localhost:{PORT}/login.html in your browser")
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print(f"\n👋 Server stopped")
        sys.exit(0)
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {PORT} is already in use. Try a different port or stop the existing server.")
        else:
            print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
