#!/usr/bin/env python3
"""Temporary HTTP server to serve the code file for browser injection."""
import http.server
import threading
import time
import os
import sys

PORT = 18765

class CORSHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="/home/z/my-project/upload", **kwargs)
    
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def log_message(self, format, *args):
        pass

server = http.server.HTTPServer(("127.0.0.1", PORT), CORSHandler)
server.serve_forever()
