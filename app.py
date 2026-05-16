from flask import Flask, render_template_string, request
import os

app = Flask(__name__)

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Flask Demo</title>
</head>
<body>
    <h1>Welcome to Flask Demo!</h1>
    <p>Current time: {{ time }}</p>
    <form action="/greet" method="post">
        <input type="text" name="name" placeholder="Enter your name">
        <button type="submit">Greet</button>
    </form>
</body>
</html>
"""

GREET_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Greeting</title>
</head>
<body>
    <h1>Hello, {{ name }}!</h1>
    <a href="/">Back</a>
</body>
</html>
"""

@app.route("/")
def index():
    from datetime import datetime
    return render_template_string(HTML_TEMPLATE, time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

@app.route("/greet", methods=["POST"])
def greet():
    name = request.form.get("name", "Guest")
    return render_template_string(GREET_TEMPLATE, name=name)

@app.route("/hello")
def hello():
    return "hello world！！！"


FILELIST_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>File List</title>
    <style>
        body { font-family: monospace; margin: 20px; }
        .directory { color: #0066cc; font-weight: bold; }
        .file { color: #333; }
        ul { list-style-type: none; padding-left: 20px; }
        li { margin: 2px 0; }
    </style>
</head>
<body>
    <h1>Directory Structure</h1>
    <p>Path: {{ base_path }}</p>
    <a href="/">Back</a>
    <ul>
        {{ tree|safe }}
    </ul>
</body>
</html>
"""

@app.route("/filelist")
def filelist():
    base_path = os.path.dirname(os.path.abspath(__file__))
    tree = generate_tree(base_path)
    return render_template_string(FILELIST_TEMPLATE, base_path=base_path, tree=tree)


if __name__ == "__main__":
    app.run(debug=True)
