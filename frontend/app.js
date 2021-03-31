let clientId = null; // clientId will save the Id sent by the backend when we connect
let gameId = null;
let ws = new WebSocket("wss://wss-backend.herokuapp.com/");

const X_CLASS = "x";
const CIRCLE_CLASS = "circle";

let initialScreen = document.getElementById("initialScreen");
let gameScreen = document.getElementById("gameScreen");
let waitForPlayerScreen = document.getElementById("waitForPlayerScreen");
let screens = [initialScreen, gameScreen, waitForPlayerScreen];

let menu = document.getElementById("menu");
let connectingSpinner = document.getElementById("connectingSpinner");
let gameCodeDisplay = document.getElementById("gameCodeDisplay");
let gameCodeInput = document.getElementById("gameCodeInput");
let board = document.getElementById("board");
let overlayWaitWrapper = document.getElementById("overlayWait-wrapper");
let overlayPlayerWon = document.getElementById("overlayPlayerWon-wrapper");
let newGameButton = document.getElementById("newGameButton");
let joinGameButton = document.getElementById("joinGameButton");
let wonOrLostDisplay = document.getElementById("wonOrLostDisplay");
let copyBtn = document.getElementById("copyBtn");
let restartBtn = document.getElementById("restartBtn");
let playAgainBtn = document.getElementById("playAgainBtn");
let errorGameCode = document.getElementById("error-gameCode");
let errorMsg = document.getElementById("error-message");

const cells = [];
for (i = 0; i < 9; i++) {
  cells.push(document.getElementById(`${i}`));
}

cells.forEach((cell) => cell.addEventListener("click", handleClick));
copyBtn.addEventListener("click", function () {
  copyElementText(gameCodeDisplay);
});

copyBtn.addEventListener("mouseleave", copyBtnMouseLeave);
newGameButton.addEventListener("click", handleNewGame);
joinGameButton.addEventListener("click", handleJoinGame);
restartBtn.addEventListener("click", handleRestart);
playAgainBtn.addEventListener("click", handlePlayAgain);
gameCodeInput.addEventListener("input", handleInput);
gameCodeInput.addEventListener("keyup", function (event) {
  if (event.key === "Enter") {
    // Trigger the button element when pressing the Enter key
    document.getElementById("joinGameButton").click();
  }
});

ws.onopen = () => {
  connectingSpinner.style.display = "none";
  menu.style.display = "flex";
};

ws.onmessage = (message) => {
  /* *******************************************************************************
  This function will be called whenever the backend sends a message to the client.
  ******************************************************************************** */

  //message.data
  const response = JSON.parse(message.data);
  if (response.method === "connect") {
    clientId = response.clientId; /* save Id sent by backend */
    console.log("Client id Set successfully " + clientId);
  }

  //create
  if (response.method === "create") {
    gameId = response.game.id;
    console.log("game successfully created with id " + response.game.id);
    gameCodeDisplay.innerHTML = `${gameId}`;
    board.classList.add(response.type);
  }

  //join
  if (response.method === "join") {
    if (!response.successfulJoin) {
      if (response.typeOfFailure === "invalidGameCode") {
        errorMsg.innerHTML = "This code does not correspond to any game";
      } else if (response.typeOfFailure === "already2Players") {
        errorMsg.innerHTML = "There are already 2 players in this game";
      }
      errorGameCode.classList.remove("hide");
      gameCodeInput.classList.add("error-border");
      return;
    }

    if (!response.successfulJoin) {
      errorGameCode.classList.add("hide");
      gameCodeInput.classList.remove("error-border");
      return;
    }

    gameId = response.game.id;
    board.classList.add(response.type);
    overlayWaitWrapper.style.display = "block";

    // Hide initialScreen and show gameScreen
    changeScreen(gameScreen);
  }

  //play
  if (response.method === "play") {
    let state = response.state;
    paintBoard(state);

    // cover the board when it's not the player's turn
    if (!response.hasTurn) {
      overlayWaitWrapper.style.display = "block";
    } else {
      overlayWaitWrapper.style.display = "none";
    }
  }

  // Second player joined
  if (response.method === "secondPlayerJoined") {
    changeScreen(gameScreen); // show board
  }

  // Someone won
  if (response.method === "win") {
    overlayWaitWrapper.style.display = "none";
    overlayPlayerWon.style.display = "block";

    if (response.wonOrLost === "Won") {
      wonOrLostDisplay.innerHTML = "You won";
    } else {
      wonOrLostDisplay.innerHTML = "You lost";
    }
  }

  // There has been a draw
  if (response.method === "draw") {
    overlayWaitWrapper.style.display = "none";
    overlayPlayerWon.style.display = "block";

    wonOrLostDisplay.innerHTML = "Draw!";
  }

  if (response.method === "disconnect") {
    // Restart the frontend
    location.reload();
  }

  if (response.method === "playAgain") {
    //update frontend
    cells.forEach((cell) => {
      cell.classList.remove(X_CLASS);
      cell.classList.remove(CIRCLE_CLASS);
    });

    overlayPlayerWon.style.display = "none";

    if (response.waitForOpponent) {
      overlayWaitWrapper.style.display = "none";
    } else {
      overlayWaitWrapper.style.display = "block";
    }
    changeScreen(gameScreen); // show board
  }
};

function handleClick(e) {
  // enviar al backend la informacion de que cell se ha clickado
  const payLoad = {
    method: "play",
    clientId: clientId,
    gameId: gameId,
    cellClicked: e.target.id,
  };
  console.log(payLoad.cellClicked);
  ws.send(JSON.stringify(payLoad));
}

function handleNewGame() {
  const payLoad = {
    method: "create",
    clientId: clientId,
  };
  ws.send(JSON.stringify(payLoad));

  // Hide initialScreen and show gameScreen
  changeScreen(waitForPlayerScreen);
}

function handleJoinGame() {
  /* if (gameId === null) gameId = txtGameId.value; */
  gameCode = gameCodeInput.value;

  const payLoad = {
    method: "join",
    clientId: clientId,
    gameId: gameCode,
  };
  ws.send(JSON.stringify(payLoad));
}

function changeScreen(screen) {
  screens.forEach((element) => {
    element.style.display = "none";
  });
  screen.style.display = "block";
}

function paintBoard(state) {
  // Updates de CSS of the game board after a user makes a move
  for (i = 0; i < 9; i++) {
    cellValue = state[i];
    if (cellValue) {
      cells[i].classList.add(cellValue); // add the X or O to the board
    } else {
      cells[i].classList.remove(X_CLASS);
      cells[i].classList.remove(CIRCLE_CLASS);
    }
  }
}

function copyElementText(id) {
  let text = id.innerText;
  let elem = document.createElement("textarea");
  document.body.appendChild(elem);
  elem.value = text;
  elem.select();
  document.execCommand("copy");
  document.body.removeChild(elem);

  copyBtn.dataset.tooltip = "Game code copied to clipboard";
}

function copyBtnMouseLeave() {
  copyBtn.dataset.tooltip = "Copy code";
}

function handleInput() {
  if (gameCodeInput.value) {
    joinGameButton.disabled = false;
  } else {
    joinGameButton.disabled = true;
  }
}

function handleRestart() {
  // Tell backend to restart the state of the game
  const payLoad = {
    method: "restart",
    clientId: clientId,
    gameId: gameId,
  };
  ws.send(JSON.stringify(payLoad));

  // Restart the frontend
  location.reload();
}

function handlePlayAgain() {
  // Tell backend to restart the state of the game
  const payLoad = {
    method: "playAgain",
    clientId: clientId,
    gameId: gameId,
  };
  ws.send(JSON.stringify(payLoad));
}
