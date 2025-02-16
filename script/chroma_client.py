import chromadb
import json

def get_chroma_client(host="localhost", port="8000"):
    """
    Connects to a ChromaDB instance.
    """
    client = chromadb.HttpClient(host=host, port=port)
    return client

def peek_collection(collection_name, limit=10):
    """
    Retrieves a limited number of items from a ChromaDB collection.
    """
    client = get_chroma_client()
    collection = client.get_collection(name=collection_name)
    results = collection.get(limit=limit)
    return results

def main():
    """
    Main function to demonstrate connecting and peeking at a collection.
    """
    collection_name = input("Enter the name of the ChromaDB collection to peek at: ")
    try:
        data = peek_collection(collection_name)
        print(json.dumps(data, indent=4))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
