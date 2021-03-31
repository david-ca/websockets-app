const guid = () =>
  /* Generates random id for clients and games */
  (
    S4() +
    S4() +
    "-" +
    S4() +
    "-4" +
    S4().substr(0, 3) +
    "-" +
    S4() +
    "-" +
    S4() +
    S4() +
    S4()
  ).toLowerCase();

function S4() {
  /*  Helper function to the function -guid- */
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

exports.guid = guid;
