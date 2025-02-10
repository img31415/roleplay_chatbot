import React from "react";
import "./App.css"; // You can add your CSS here
import Chat from "./components/Chat";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Role-Playing Chatbot</h1>
      </header>
      <main>
        <Chat />
      </main>
    </div>
  );
}

export default App;
