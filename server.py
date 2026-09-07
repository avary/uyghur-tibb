import os
import sys
import socket
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def find_available_port(start=8080):
    for port in range(start, start + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('0.0.0.0', port)) != 0:
                return port
    return start

class CustomHandler(SimpleHTTPRequestHandler):
    extensions_map = SimpleHTTPRequestHandler.extensions_map.copy()
    extensions_map.update({
        '.webmanifest': 'application/manifest+json',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.js': 'application/javascript',
        '.html': 'text/html; charset=utf-8',
        '.woff': 'application/font-woff'
    })

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def log_message(self, format, *args):
        # Clean terminal logging
        sys.stdout.write(f"[{self.log_date_time_string()}] {args[0]} {args[1]}\n")

def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    ip = get_local_ip()
    port = find_available_port(8080)
    mobile_url = f"http://{ip}:{port}/"
    local_url = f"http://localhost:{port}/"
    connect_url = f"http://localhost:{port}/connect.html"

    # Generate QR Code SVG if qrcode is installed
    try:
        import qrcode
        import qrcode.image.svg
        factory = qrcode.image.svg.SvgPathImage
        svg_img = qrcode.make(mobile_url, image_factory=factory)
        svg_img.save("qr.svg")
    except Exception:
        pass

    # Update connect.html targetUrl with current IP
    try:
        connect_path = os.path.join(script_dir, "connect.html")
        if os.path.exists(connect_path):
            with open(connect_path, "r", encoding="utf-8") as f:
                c_html = f.read()
            import re
            c_html = re.sub(r'var host = location\.hostname \|\| "[^"]+"', f'var host = location.hostname || "{ip}"', c_html)
            c_html = re.sub(r':8080', f':{port}', c_html)
            with open(connect_path, "w", encoding="utf-8") as f:
                f.write(c_html)
    except Exception as e:
        print("Notice:", e)

    server = HTTPServer(('0.0.0.0', port), CustomHandler)

    border = "=" * 65
    print("\n" + border)
    print("       🌿 ئۇيغۇر تېبابىتى نەزەرىيە ئۆگىنىش ئەپى قوزغالدى 🌿")
    print(border)
    print(f"\n💻 كومپىيوتېردا ئېچىش ئادرېسى:")
    print(f"   👉  {local_url}")
    print(f"\n📱 تېلېفوندا ئېچىش ئادرېسى (تېلېفون ۋە PC بىرلا Wi-Fi غا ئۇلانغان بولسۇن):")
    print(f"   👉  {mobile_url}")
    print("\n" + "-" * 65)

    try:
        import qrcode
        qr = qrcode.QRCode()
        qr.add_data(mobile_url)
        qr.make()
        print("📲 تېلېفونىڭىزنىڭ كامېراسى بىلەن تۆۋەندىكى كودنى سايىلەڭ:")
        qr.print_ascii(invert=True)
    except Exception:
        pass

    print("-" * 65)
    print(f"💡 كومپىيوتېرىڭىزدا تەپسىلىي كۆرسەتمە ۋە چوڭ QR كود ئېچىلدى:")
    print(f"   👉  {connect_url}")
    print("\n[ چىكىنىش ئۈچۈن Ctrl + C نى بېسىڭ ]\n")

    # Automatically open in default browser
    try:
        webbrowser.open(connect_url)
    except Exception:
        pass

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\nمۇلازىمەت توختىتىلدى.")
        server.server_close()

if __name__ == '__main__':
    main()
