import asyncio
import websockets
import json

async def test_chat():
    uri = "ws://127.0.0.1:8000/api/ws/chat"
    
    async with websockets.connect(uri) as websocket:
        print("✅ Connected to WebSocket")
        
        # Send first question
        await websocket.send(json.dumps({
            "question": "What is the main topic of the document?"
        }))
        print("📤 Sent question")
        
        session_id = None
        
        # Receive responses
        while True:
            try:
                message = await websocket.recv()
                data = json.loads(message)
                
                if data['type'] == 'session_id':
                    session_id = data['session_id']
                    print(f"🆔 Session ID: {session_id}")
                
                elif data['type'] == 'sources':
                    print(f"📚 Sources: {data['sources']}")
                
                elif data['type'] == 'token':
                    print(data['content'], end='', flush=True)
                
                elif data['type'] == 'done':
                    print(f"\n✅ Done! Turns: {data['conversation_turns']}")
                    break
                
                elif data['type'] == 'error':
                    print(f"❌ Error: {data['message']}")
                    break
                    
            except websockets.exceptions.ConnectionClosed:
                print("\n❌ Connection closed")
                break

if __name__ == "__main__":
    asyncio.run(test_chat())