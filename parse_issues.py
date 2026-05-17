import json
import sys

try:
    with open('C:/Users/rcbon/.gemini/antigravity/brain/605ec381-f0d9-456a-b1e8-c4413b63e387/.system_generated/steps/3684/output.txt', 'r', encoding='utf-8') as f:
        data = json.load(f)
        for i in data:
            print(f"#{i['number']}: {i['title']}".encode('ascii', 'ignore').decode('ascii'))
except Exception as e:
    print(e)
