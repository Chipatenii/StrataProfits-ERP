import os
import re

api_dir = 'app/api'

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We want to find cases like:
    # export async function GET(request: NextRequest) {
    #     const supabase = await createClient()
    #     ...
    #     if (!user) { ... }
    #     try {

    # Or functions that do not have a try at all but use createClient
    
    # Actually, a simpler approach: 
    # Let's just find and report all routes that have `createClient()` outside of `try {` block.
    
    # We can split the content by functions
    methods = ['GET', 'POST', 'PATCH', 'DELETE', 'PUT']
    for m in methods:
        pattern = rf'export async function {m}\s*\(.*?\)\s*{{(.*?)try\s*{{'
        matches = re.finditer(pattern, content, re.DOTALL)
        for match in matches:
            pre_try_block = match.group(1)
            if 'createClient()' in pre_try_block or 'checkPermission' in pre_try_block or 'createAdminClient()' in pre_try_block:
                print(f"File {filepath} has DB init before try block in {m}")
                return

for root, dirs, files in os.walk(api_dir):
    for f in files:
        if f.endswith('.ts'):
            process_file(os.path.join(root, f))
