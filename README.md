# websockets-tictactoe

To run this app, go to 

https://websockets-tictactoe.netlify.app/

To see a demo on how to use this app, watch this:

https://www.youtube.com/watch?v=LB65Bh7NU6o&ab_channel=DavidCarrasco

This app allows you to play the tic-tac-toe (tres en raya) game against anyone in the world in real time, using 
websockets for the communication.

You can play against yourself by opening the app twice, each in a different tab in your browser.

When you start a game you are given a game ID, which you can give to your opponent so he can join your room and
play against you.

The frontend was done in vanilla JavaScript (no frameworks such as React or Angular) and the backend was made with
NodeJS and websockets protocol.

The interesting thing about the websockets protocol is that, unlike the http protocol, it allows for "unsolicited" 
communication; that is, the server can send you information without you having asked for it first. That makes it 
useful for applications such as chats or, in this case, a game. That's why calling it "the server" may not be 
accurate, since it does not merely serve a client.
