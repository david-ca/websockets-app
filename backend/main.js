function main() {
  const WebSocket = require("ws");
  const utils = require("./utils.js");
  const PORT = process.env.PORT || 9090;
  const wsServer = new WebSocket.Server({ port: PORT });

  const clients = {};
  const games = {};
  const WINNING_COMBINATIONS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  wsServer.on("connection", (connection) => {
    /* 
      This function executes whenever a new client connects to the app
    */
    const clientId = utils.guid(); //generate a new client Id
    clients[clientId] = {
      connection: connection,
    };

    //send to the client connection (socket)
    const payLoad = {
      method: "connect",
      clientId: clientId,
    };

    connection.send(JSON.stringify(payLoad));

    connection.on("close", () => {
      console.log("closed!");
      onCloseCallback(clients, connection);
    });

    connection.on("message", (message) => {
      onMessageCallback(message);
    });
  });

  function onCloseCallback(clients, connection) {
    /* 
      Tells the opponent that this user left 
    */

    // Obtain the clientId of the client that just closed its connection
    let clientId;
    let clientIds = Object.keys(clients);
    for (let i = 0; i < clientIds.length; i++) {
      if (clients[clientIds[i]].connection === connection) {
        clientId = clientIds[i];
      }
    }

    if (!clients[clientId]) return; // The player that closed was alone, wasn't in a room with other player

    // find in which game the current player is
    Object.keys(games).forEach((gameId) => {
      let game = games[gameId];

      // <index> will be:
      // 0 if it's the first player
      // 1 if it's the second player
      //-1 if it's not in this game
      let index = game.clients.findIndex((x) => x.clientId === clientId);

      // If the user is one of the two players of this game,
      // and if this game has two players:
      if (index !== -1 && game.clients.length > 1) {
        let otherPlayerIndex; // 0 or 1
        index ? (otherPlayerIndex = 0) : (otherPlayerIndex = 1); // if index is 1, otherPlayerIndex must be 0
        otherClientId = game.clients[otherPlayerIndex].clientId;
        // send message to the opponent
        let payLoad = {
          method: "disconnect",
        };
        clients[otherClientId].connection.send(JSON.stringify(payLoad));
      }
    });
  }

  function onMessageCallback(message) {
    /* 
      This function executes whenever a client sends a message to the server
    */
    const msg = JSON.parse(message);

    // check that the user sent the server a valid message
    if (!checkMessage(msg, clients, games)) return;

    /*_______________________________________________________________________________________ */

    if (msg.method === "create") {
      // adds game to the object -games- and sends the game's Id to the client
      const clientId = msg.clientId;
      clients[clientId].type = "x"; // add type = "x"
      const gameId = utils.guid(); // generate game Id
      games[gameId] = {
        id: gameId,
        clients: [
          {
            clientId: clientId,
            hasTurn: true, // true if player has the turn, false if he doesn't
          },
        ],
        state: [null, null, null, null, null, null, null, null, null],
      };
      const payLoad = {
        method: "create",
        game: games[gameId],
        type: "x", // so that the CSS hover effect is an X
      };
      clients[clientId].connection.send(JSON.stringify(payLoad));
    }

    /*_______________________________________________________________________________________ */

    if (msg.method === "join") {
      const clientId = msg.clientId;
      clients[clientId].type = "circle"; // add type = "circle"
      const gameId = msg.gameId;
      const game = games[gameId];
      if (!game) {
        let payLoad = {
          method: "join",
          successfulJoin: false,
          typeOfFailure: "invalidGameCode",
        };
        clients[clientId].connection.send(JSON.stringify(payLoad));
        return;
      }

      if (game.clients.length >= 2) {
        let payLoad = {
          method: "join",
          successfulJoin: false,
          typeOfFailure: "already2Players",
        };
        clients[clientId].connection.send(JSON.stringify(payLoad));
        return;
      }

      game.clients.push({
        clientId: clientId,
        hasTurn: false,
      });

      let payLoad = {
        method: "join",
        successfulJoin: true,
        game: games[gameId],
        type: "circle", // so that the hover effect is a circle
      };
      clients[clientId].connection.send(JSON.stringify(payLoad));

      // notify the first player that the second player joined the game
      payLoad = {
        method: "secondPlayerJoined",
      };

      firstPlayerId = games[gameId].clients[0].clientId;
      clients[firstPlayerId].connection.send(JSON.stringify(payLoad));
    }

    /*_______________________________________________________________________________________ */

    if (msg.method === "play") {
      const clientId = msg.clientId;
      const gameId = msg.gameId;
      const type = clients[clientId].type;
      const cellClicked = msg.cellClicked;

      const game = games[gameId];
      let state = game.state;

      // check if it's the player's turn
      index = game.clients.findIndex((x) => x.clientId === clientId);
      if (game.clients[index].hasTurn) {
        // change the turns
        game.clients[0].hasTurn = !game.clients[0].hasTurn;
        game.clients[1].hasTurn = !game.clients[1].hasTurn;

        // modify the game state with the info sent by the user when clicking on board cell
        if (state[cellClicked] === null) {
          state[cellClicked] = type;
        }

        // send the game state to both players so they can render it on the screen
        let payLoad1 = {
          method: "play",
          state: state,
          hasTurn: game.clients[0].hasTurn,
        };
        let payLoad2 = {
          method: "play",
          state: state,
          hasTurn: game.clients[1].hasTurn,
        };
        firstPlayerId = game.clients[0].clientId;
        secondPlayerId = game.clients[1].clientId;
        clients[firstPlayerId].connection.send(JSON.stringify(payLoad1));
        clients[secondPlayerId].connection.send(JSON.stringify(payLoad2));

        // check for winner
        if (checkWin(state, type)) {
          // The player who just made a move is the winner
          payLoad1 = {
            method: "win",
            wonOrLost: "Won",
          };
          clients[clientId].connection.send(JSON.stringify(payLoad1));

          // The other player lost, communicate this fact to that player
          payLoad2 = {
            method: "win",
            wonOrLost: "Lost",
          };
          let playerWhoLostIndex;
          index ? (playerWhoLostIndex = 0) : (playerWhoLostIndex = 1);
          playerWhoLostId = game.clients[playerWhoLostIndex].clientId;
          clients[playerWhoLostId].connection.send(JSON.stringify(payLoad2));
        } else if (checkDraw(state)) {
          let payLoad = {
            method: "draw",
          };
          firstPlayerId = game.clients[0].clientId;
          secondPlayerId = game.clients[1].clientId;
          clients[firstPlayerId].connection.send(JSON.stringify(payLoad));
          clients[secondPlayerId].connection.send(JSON.stringify(payLoad));
        }
      }
    }

    /*_______________________________________________________________________________________ */

    if (msg.method === "restart") {
      // Reset the game state
      resetGameState(games[msg.gameId]);
    }

    /*_______________________________________________________________________________________ */

    if (msg.method === "playAgain") {
      const game = games[msg.gameId];

      // Reset the game state

      resetGameState(game);

      // Communicate to both clients that another game begins,
      // so that they prepare the frontend for it

      let payLoad1 = {
        method: "playAgain",
        waitForOpponent: game.clients[0].hasTurn,
      };

      let payLoad2 = {
        method: "playAgain",
        waitForOpponent: game.clients[1].hasTurn,
      };

      firstPlayerId = game.clients[0].clientId;
      secondPlayerId = game.clients[1].clientId;

      clients[firstPlayerId].connection.send(JSON.stringify(payLoad1));
      clients[secondPlayerId].connection.send(JSON.stringify(payLoad2));
    }
  }

  function resetGameState(game) {
    /* 
      Resets the state of the game 
    */
    game.state = [null, null, null, null, null, null, null, null, null];
  }

  function checkMessage(msg, clients, games) {
    /* 
      Returns "True" if it's a valid message, and "False" if it's an invalid one 
    */

    if (msg.method === "create") {
      if (!checkClientId(msg.clientId, clients)) return false;
      return true;
    } else if (msg.method === "join") {
      if (!checkClientId(msg.clientId, clients)) return false;
      return true;
    } else if (msg.method === "play") {
      if (!checkClientId(msg.clientId, clients)) return false;
      if (!checkGameId(msg.clientId, clients)) return false;
      if (!checkType(msg.clientId, clients)) return false;
      if (!checkCellClicked(msg.cellClicked)) return false;
      if (!checkHasTurn(msg.clientId, msg.gameId, games)) return false;
      return true;
    } else if (msg.method === "restart") {
      if (!checkGameId(msg.clientId, clients)) return false;
      return true;
    } else if (msg.method === "playAgain") {
      if (!checkGameId(msg.clientId, clients)) return false;
      return true;
    } else {
      return false;
    }
  }

  function checkClientId(clientId, clients) {
    /* 
      Checks that there's a client with the <clientId> Id
    */
    if (clients[clientId]) {
      return true;
    } else {
      return false;
    }
  }

  function checkGameId(gameId, games) {
    /* 
      Checks that there's a game with the <gameId> Id
    */
    if (games[gameId]) {
      return true;
    } else {
      return false;
    }
  }

  function checkType(clientId, clients) {
    /* 
      Checks that the client's type is either "x" or "circle"
    */
    let type = clients[clientId].type;
    if (type === "x" || type === "circle") {
      return true;
    } else {
      return false;
    }
  }

  function checkCellClicked(cellClicked) {
    /* 
      Checks that the cell clicked is a number between 0 and 8
    */
    cellClicked = parseInt(cellClicked);
    if (typeof cellClicked !== "number") return false;

    if (cellClicked >= 0 && cellClicked < 9) {
      return true;
    } else {
      return false;
    }
  }

  function checkHasTurn(clientId, gameId, games) {
    /* 
      Checks that the player who sent this message has the turn to move
    */
    game = games[gameId];
    index = game.clients.findIndex((x) => x.clientId === clientId);

    if (game.clients[index].hasTurn) {
      return true;
    } else {
      return false;
    }
  }

  function checkWin(state, type) {
    /* 
      Checks if any of the players has won
    */
    return WINNING_COMBINATIONS.some((combination) => {
      return combination.every((index) => {
        return state[index] === type;
      });
    });
  }

  function checkDraw(state) {
    /* 
      Checks if the game has ended without a winner
    */
    return state.every((cell) => {
      return cell === "x" || cell === "circle";
    });
  }
}

exports.main = main;
