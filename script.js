document.addEventListener("DOMContentLoaded", () => {
  // runs when the dom is fully loaded and ready
  const startScreen = document.getElementById("start-screen"); // selects the start screen element so it can be hidden later
  const modeButtons = document.querySelectorAll(".mode-btn"); // gathers all mode buttons to attach click events

  modeButtons.forEach((btn) => {
    // goes through each mode button one by one
    btn.addEventListener("click", async () => {
      // triggers when a mode button is clicked
      const selectedMode = btn.getAttribute("data-mode"); // understands which mode is selected from the button attribute
      startScreen.style.display = "none"; // hides the start screen to reveal the game area
      await startGame(selectedMode); // starts the game with the chosen mode and waits for it to initialize
    });
  });
});

let currentMode = "classic"; // sets the current game mode to "classic" as the default starting mode

async function startGame(mode) {
  // starts the game with the selected mode and sets everything up
  currentMode = mode; // updates the currentMode variable to match the chosen mode
  modeSelect.value = mode; // reflects the chosen mode in the mode selection dropdown or UI

  const wordLength = mode === "hard-7" ? 7 : 5; // determines the length of the word based on mode, 7 for hard-7, otherwise 5
  const maxGuesses = 6; // sets the maximum number of guesses the player can make

  let guessedLetters = [Array(wordLength).fill("")]; // creates an array to keep track of guessed letters for each row
  let currentTile = 1; // starts counting tiles from 1 for the first letter
  let guessCount = 0; // initializes the number of guesses the player has made
  let gameOver = false; // flag to track if the game has ended
  let submitting = false; // flag to prevent multiple submissions at once
  let word = ""; // will hold the target word to guess

  let revealIndex = null; // used to keep track of which letter to reveal next
  let revealLetter = null; // stores the letter that will be revealed

  const fixedTiles = new Set(); // keeps track of tiles that are already confirmed or fixed
  const keys = document.querySelectorAll(".keyboard-row button"); // selects all on-screen keyboard buttons

  createBoard(maxGuesses, wordLength); // creates the game board with the correct number of rows and tiles

  function removeAccents(str) {
    // takes a string and removes specific accented characters
    return str
      .replace(/Â/g, "A") // replaces all uppercase Â with A
      .replace(/Î/g, "I") // replaces all uppercase Î with I
      .replace(/â/g, "a") // replaces all lowercase â with a
      .replace(/î/g, "i"); // replaces all lowercase î with i
  }

  async function fetchWordList() {
    // fetches a list of words from an external source and prepares them for the game
    try {
      const response = await fetch("https://sozluk.gov.tr/autocomplete.json"); // requests the JSON file from the Turkish dictionary API
      const data = await response.json(); // converts the response into a usable JavaScript object

      return data
        .map((obj) => obj.madde) // extracts the 'madde' property from each object, which contains the actual word
        .filter((w) => w.length === wordLength) // keeps only words that match the current game's word length
        .map((w) => w.toLowerCase()); // converts all words to lowercase for easier comparison during the game
    } catch (err) {
      // if something goes wrong during fetching or processing
      console.error("Error fetching word list:", err); // logs the error for debugging
      return []; // returns an empty array so the game doesn't break
    }
  }

  const wordList = await fetchWordList(); // waits for the word list to be fetched from the server

  if (!wordList.length) {
    // checks if the word list is empty
    showAlert("Kelime listesi alınamadı!"); // shows an alert if no words could be fetched
    return; // stops the game setup because there are no words to play with
  }

  function pickRandomWord() {
    // selects a random word from the list and removes any accents
    return removeAccents(wordList[Math.floor(Math.random() * wordList.length)]); // picks a random index and cleans the word
  }

  word = pickRandomWord(); // assigns the randomly picked, cleaned word as the target word for the game
  console.log("Selected word:", word); // logs the chosen word to the console for debugging purposes

  if (mode === "easy" && wordLength === 5) {
    // if the player chose easy mode and the word has 5 letters
    revealIndex = Math.floor(Math.random() * wordLength); // randomly choose an index of the word to reveal
    revealLetter = word[revealIndex]; // get the letter at that index to show it to the player

    const tileId = 1 + revealIndex; // calculate the corresponding tile id on the board (tiles are 1-based)
    const tile = document.getElementById(String(tileId)); // get the tile element from the DOM
    if (tile) {
      // if the tile exists
      tile.textContent = revealLetter; // display the revealed letter on the tile
      tile.classList.add("fixed", "true"); // mark the tile as fixed so it cannot be changed
      fixedTiles.add(tileId); // keep track of this fixed tile in the set
    }

    guessedLetters = [Array(wordLength).fill("")]; // reset guessed letters array
    guessedLetters[0][revealIndex] = revealLetter; // store the revealed letter in the first guess

    currentTile = 1; // start from the first tile
    while (fixedTiles.has(currentTile) && currentTile <= wordLength)
      // skip over tiles that are already fixed
      currentTile++; // move to the next available tile
  }

  async function restartGame() {
    // resets the game state and starts a new round
    word = pickRandomWord(); // selects a new random word for the game
    console.log("New Word:", word); // logs the new word for debugging purposes

    guessedLetters = [Array(wordLength).fill("")]; // resets the guessed letters array
    currentTile = 1; // resets the current tile pointer to the first tile
    guessCount = 0; // resets the number of guesses made
    gameOver = false; // marks the game as not over
    submitting = false; // ensures no submission is currently in progress
    revealIndex = null; // clears any previously revealed letter index
    revealLetter = null; // clears any previously revealed letter
    fixedTiles.clear(); // removes all fixed tiles from previous game

    createBoard(maxGuesses, wordLength); // rebuilds the game board for the new word

    if (mode === "easy" && wordLength === 5) {
      // if the game is in easy mode and the word has 5 letters
      revealIndex = Math.floor(Math.random() * wordLength); // randomly select an index of the word to reveal
      revealLetter = word[revealIndex]; // get the letter at that index

      const tileId = 1 + revealIndex; // calculate the corresponding tile id (tiles start at 1)
      const tile = document.getElementById(String(tileId)); // select the tile element in the DOM
      if (tile) {
        // if the tile exists
        tile.textContent = revealLetter; // display the revealed letter on the tile
        tile.classList.add("fixed", "true"); // mark this tile as fixed so it cannot be changed
        fixedTiles.add(tileId); // keep track of this fixed tile
      }

      guessedLetters[0][revealIndex] = revealLetter; // store the revealed letter in the first guess
      currentTile = 1; // start from the first tile
      while (fixedTiles.has(currentTile) && currentTile <= wordLength)
        // skip over tiles that are already fixed
        currentTile++; // move to the next available tile
    }

    // reset all on-screen keyboard buttons for the new game
    document
      .querySelectorAll(".keyboard-row button") // select all keyboard buttons
      .forEach(
        (btn) =>
          btn.classList.remove("disabled-key", "true", "false", "wrong-place") // remove all previous status classes
      );
  }

  function getCurrentGuess() {
    // retrieves the current row of letters that the player is typing
    return guessedLetters[guessedLetters.length - 1]; // returns the last array in guessedLetters
  }

  function addLetterToGuess(letter) {
    // adds a typed letter to the current guess
    if (gameOver) return; // do nothing if the game has already ended
    letter = removeAccents(letter); // remove any accents from the letter for consistency

    const currentGuess = getCurrentGuess(); // get the current guess array
    const writeIndex = currentGuess.findIndex((ch, i) => {
      // find the first empty spot in the current guess
      if (mode === "easy" && i === revealIndex && guessCount === 0)
        // skip the revealed letter in easy mode
        return false;
      return ch === ""; // return the index of the first empty tile
    });

    if (writeIndex === -1) return; // if no empty spot is found, do nothing

    const tileId = guessCount * wordLength + (writeIndex + 1); // calculate the tile id on the board
    const tile = document.getElementById(String(tileId)); // select the corresponding tile element
    if (tile) {
      // if the tile exists
      currentGuess[writeIndex] = letter; // store the letter in the current guess array
      tile.textContent = letter; // display the letter on the tile
      currentTile = writeIndex + 1; // move the current tile pointer forward
    }
  }

  function removeLetterFromGuess() {
    // removes the last letter typed in the current guess
    if (gameOver) return; // do nothing if the game has already ended

    const currentGuess = getCurrentGuess(); // get the current row of letters
    let removeIndex = -1; // initialize the index of the letter to remove

    // start checking from the end of the word backwards
    for (let i = wordLength - 1; i >= 0; i--) {
      if (mode === "easy" && i === revealIndex && guessCount === 0) continue; // skip the revealed letter in easy mode
      if (currentGuess[i] !== "") {
        // find the last non-empty letter
        removeIndex = i; // mark it for removal
        break;
      }
    }

    if (removeIndex === -1) return; // if no letter found, do nothing

    const tileId = guessCount * wordLength + (removeIndex + 1); // calculate the corresponding tile id on the board
    const tile = document.getElementById(String(tileId)); // select the tile element
    if (tile) {
      // if the tile exists
      tile.textContent = ""; // remove the letter from the board
      currentGuess[removeIndex] = ""; // remove the letter from the current guess array
    }
  }

  async function submitGuess() {
    // submits the current guess and checks it against the target word
    if (gameOver || submitting) return; // do nothing if the game is over or a submission is already in progress
    submitting = true; // mark that a submission is happening to prevent duplicate actions

    const currentGuess = getCurrentGuess(); // get the current row of letters the player has typed

    // calculate the number of editable slots (exclude the revealed letter in easy mode)
    const editableSlots =
      wordLength -
      (mode === "easy" && revealIndex !== null && guessCount === 0 ? 1 : 0);

    // count how many of the editable slots have been filled with letters
    const filledEditable = currentGuess.reduce((acc, ch, i) => {
      if (mode === "easy" && i === revealIndex && guessCount === 0) return acc; // skip the revealed letter
      return acc + (ch !== "" ? 1 : 0); // increment counter for each non-empty slot
    }, 0);

    if (filledEditable < editableSlots) {
      // check if the player has filled all editable slots
      showAlert(`Kelime ${wordLength} harften oluşmalı!`); // show an alert if the guess is incomplete
      submitting = false; // reset the submitting flag so the player can try again
      return; // stop the submission because the guess is not valid
    }

    // create the final guessed word as a string
    const guessWord = currentGuess
      .map((ch, i) => {
        // go through each letter in the current guess
        if (mode === "easy" && i === revealIndex && guessCount === 0)
          // if it's the revealed letter in easy mode
          return revealLetter; // use the revealed letter instead of the empty slot
        return ch; // otherwise, use the typed letter
      })
      .join(""); // join all letters together into a single word string

    const guessWordNoAccents = removeAccents(guessWord); // remove any accents from the guessed word for reliable comparison
    const wordListNoAccents = wordList.map((w) => removeAccents(w)); // remove accents from all words in the word list

    // check if the cleaned guessed word exists in the cleaned word list
    if (!wordListNoAccents.includes(guessWordNoAccents)) {
      showAlert("Geçersiz kelime!"); // show an alert if the word is not in the list
      submitting = false; // reset the submitting flag so the player can try again
      return; // stop the submission because the guess is invalid
    }

    let colors = []; // this array will hold the result for each letter: correct, wrong place, or incorrect
    let correct = 0; // counter for letters that are in the correct position
    let wordLetters = word.split(""); // split the target word into an array of letters for checking

    // first pass: check for letters that are in the correct position
    for (let i = 0; i < wordLength; i++) {
      if (guessWord[i] === word[i]) {
        // if the guessed letter matches the target letter at the same position
        colors[i] = "true"; // mark this letter as correct
        wordLetters[i] = null; // remove it from the array to prevent double-counting in the next pass
        correct++; // increment the count of correctly placed letters
      }
    }

    // second pass: check for letters that are in the word but in the wrong position
    for (let i = 0; i < wordLength; i++) {
      if (colors[i]) continue; // skip letters that were already marked as correct

      const index = wordLetters.indexOf(guessWord[i]); // find the guessed letter in the remaining letters of the target word
      if (index !== -1) {
        // if the letter exists somewhere else in the word
        colors[i] = "wrong-place"; // mark it as in the wrong position
        wordLetters[index] = null; // remove it so it is not counted again
      } else {
        // if the letter does not exist in the word at all
        colors[i] = "false"; // mark it as incorrect
        disableLetter(guessWord[i]); // disable the letter on the on-screen keyboard
      }
    }

    const firstTileId = guessCount * wordLength + 1; // calculate the id of the first tile in the current guess row

    // animate each tile with the corresponding color
    currentGuess.forEach((letter, i) => {
      setTimeout(() => {
        // stagger the animation for each letter
        const tile = document.getElementById(firstTileId + i); // select the tile element for this letter
        tile.classList.add("animate__flipInX", colors[i]); // add a flip animation and color class (true, false, wrong-place)
      }, i * 200); // delay each tile's animation by 200ms * index for sequential effect
    });

    if (correct === wordLength) {
      // check if all letters are correctly placed
      gameOver = true; // mark the game as over since the player guessed the word

      setTimeout(async () => {
        // wait a moment before showing the congratulations alert
        try {
          const response = await fetch(`https://sozluk.gov.tr/gts?ara=${word}`); // fetch the meaning of the word from the Turkish dictionary API
          const data = await response.json(); // parse the response into JSON
          const firstMeaning =
            data[0]?.anlamlarListe?.[0]?.anlam || "Anlam bulunamadı."; // get the first meaning if available

          showAlert(
            `Tebrikler!\nKelime: "${word}"\nAnlamı: ${firstMeaning.toLowerCase()}.\nTekrar oynamak için yeni kelime butonuna basın.`
            // show an alert with the word, its meaning, and instructions to play again
          );
        } catch {
          // if fetching the meaning fails
          showAlert(
            `Tebrikler!\nKelime: "${word}".\nAnlamı: Anlam bulunamadı.\nTekrar oynamak için yeni kelime butonuna basın.`
            // show a fallback alert with the word but no meaning
          );
        }
      }, 1000); // delay the alert by 1 second to let the flip animations finish

      submitting = false; // reset the submitting flag
      return; // stop further execution since the game is over
    }
    if (guessedLetters.length === maxGuesses) {
      // check if the player has used all their guesses
      gameOver = true; // mark the game as over since no guesses remain

      setTimeout(async () => {
        // wait a moment before showing the alert
        try {
          const response = await fetch(`https://sozluk.gov.tr/gts?ara=${word}`); // fetch the meaning of the word from the Turkish dictionary API
          const data = await response.json(); // parse the response into JSON
          const firstMeaning =
            data[0]?.anlamlarListe?.[0]?.anlam || "Anlam bulunamadı."; // get the first meaning if available

          showAlert(
            `Tahmin hakkınız bitti!\nKelime: "${word}"\nAnlamı: ${firstMeaning.toLowerCase()}.\nTekrar oynamak için yeni kelime butonuna basın.`
            // show an alert with the word, its meaning, and instructions to play again
          );
        } catch {
          // if fetching the meaning fails
          showAlert(
            `Tahmin hakkınız bitti!\nKelime: "${word}"\nAnlamı: Anlam bulunamadı.\nTekrar oynamak için yeni kelime butonuna basın.`
            // fallback alert without the meaning
          );
        }
      }, 1000); // delay the alert by 1 second to let flip animations finish
    }

    guessCount++; // increment the number of guesses made
    guessedLetters.push(Array(wordLength).fill("")); // prepare a new empty row for the next guess
    submitting = false; // reset the submitting flag so the player can type again
  }
  keys.forEach((key) => {
    // go through all on-screen keyboard buttons
    key.onclick = () => {
      // attach a click event to each key
      const letter = key.getAttribute("data-key"); // get the letter or command from the button

      if (letter === "enter")
        submitGuess(); // if the key is Enter, submit the current guess
      else if (letter === "del")
        removeLetterFromGuess(); // if the key is Delete, remove the last letter
      else addLetterToGuess(letter); // otherwise, add the clicked letter to the current guess
    };
  });

  document.addEventListener("keydown", (e) => {
    // listen for physical keyboard input
    if (e.ctrlKey || e.altKey || e.metaKey) return; // ignore key combinations with Ctrl, Alt, or Meta

    const letter = e.key.toLowerCase(); // get the key pressed, and convert it to lowercase

    if (letter === "enter") {
      // if Enter is pressed
      e.preventDefault(); // prevent the default behavior, such as form submission
      submitGuess(); // submit the current guess
    } else if (letter === "backspace")
      // if Backspace is pressed
      removeLetterFromGuess(); // remove the last letter from the current guess
    else if (letter.match(/^[a-zığüşöç]$/i)) {
      // if the key is a valid letter, including Turkish characters
      addLetterToGuess(letter); // add the letter to the current guess
    }
  });

  const themeSwitch = document.querySelector(".theme-switch"); // select the theme toggle button

  themeSwitch.addEventListener("click", () => {
    // listen for clicks on the theme button
    themeSwitch.classList.toggle("active"); // visually toggle the button's active state
    document.body.classList.toggle("dark-mode"); // toggle the dark mode class on the body to switch themes
  });

  function showAlert(message) {
    // shows a custom alert box with a message
    const alertBox = document.getElementById("alert"); // select the alert container
    const alertText = document.getElementById("alert-text"); // select the element where the message will appear
    const alertBtn = document.getElementById("alert-btn"); // select the button to close the alert

    alertText.textContent = message; // set the alert message
    alertBox.classList.add("show"); // make the alert visible by adding the "show" class

    alertBtn.onclick = () => alertBox.classList.remove("show"); // hide the alert when the button is clicked
  }

  // attach the restartGame function to the "new word" button
  document.getElementById("new-word-btn").onclick = restartGame;
}

function disableLetter(letter) {
  // disables a specific letter on the on-screen keyboard
  const keyButtons = document.querySelectorAll(`button[data-key="${letter}"]`); // select all buttons that match the letter
  keyButtons.forEach((btn) => btn.classList.add("disabled-key")); // add the "disabled-key" class to visually disable them
}

function createBoard(maxGuesses = 6, wordLength = 5) {
  // creates the game board dynamically
  const board = document.getElementById("board"); // select the board container
  board.innerHTML = ""; // clear any existing tiles

  // create the tiles for all guesses
  for (let i = 0; i < maxGuesses * wordLength; i++) {
    const tile = document.createElement("div"); // create a new div for the tile
    tile.classList.add("tile"); // add the "tile" class for styling
    tile.setAttribute("id", i + 1); // set a unique id for each tile
    board.appendChild(tile); // add the tile to the board
  }

  board.style.gridTemplateColumns = `repeat(${wordLength}, 1fr)`; // set the board layout to have equal columns for each letter
}

const settingsBtn = document.getElementById("settings-btn"); // select the settings button
const settingsPanel = document.getElementById("settings-panel"); // select the settings panel container
const closeSettings = document.getElementById("close-settings"); // select the close button inside the settings panel
const modeSelect = document.getElementById("mode-select"); // select the mode dropdown in the settings panel

settingsBtn.addEventListener("click", () => {
  // listen for clicks on the settings button
  settingsPanel.classList.toggle("hidden"); // toggle the visibility of the settings panel
  modeSelect.value = currentMode; // update the dropdown to reflect the current mode
});

closeSettings.addEventListener("click", () => {
  // listen for clicks on the close button
  settingsPanel.classList.add("hidden"); // hide the settings panel when clicked
});

modeSelect.addEventListener("change", () => {
  // listen for changes in the mode dropdown
  const newMode = modeSelect.value; // get the newly selected mode
  if (newMode !== currentMode) {
    // if the selected mode is different from the current mode
    setGameMode(newMode); // update the game mode
  }
});

function setGameMode(newMode) {
  // updates the game mode and resets the board
  const board = document.getElementById("board"); // select the game board
  board.innerHTML = ""; // clear all tiles from the board

  const keyboard = document.querySelectorAll("#keyboard-container button"); // select all on-screen keyboard buttons
  keyboard.forEach(
    (btn) =>
      btn.classList.remove("disabled-key", "true", "false", "wrong-place") // reset all key styles and states
  );

  startGame(newMode); // start a new game with the selected mode
}
