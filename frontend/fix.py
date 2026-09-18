import re

with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

text = re.sub(r'id="nav-login-btn">.*?</button>', 'id="nav-login-btn">\n            Admin login <span class="btn-arrow" aria-hidden="true">→</span>\n          </button>', text, flags=re.DOTALL)

text = re.sub(r'id="hero-login-btn">\s*Get started.*?</button>', 'id="hero-login-btn">\n                Get started <span class="btn-arrow" aria-hidden="true">→</span>\n              </button>', text, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(text)
