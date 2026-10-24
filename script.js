const form = document.querySelector("#search-form");
const input = document.querySelector("#word-input");
const statusBox = document.querySelector("#status");
const resultsBox = document.querySelector("#results");
const searchButton = document.querySelector("#search-button");

function showStatus(message, type = "") {
  statusBox.textContent = message;
  statusBox.className = `status ${type}`.trim();
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function addDefinitionSection(entry) {
  const card = makeElement("article", "word-result");
  const head = makeElement("div", "word-head");
  const titleWrap = makeElement("div");
  titleWrap.appendChild(makeElement("h2", "", entry.word || "Word"));
  const phonetic = entry.phonetic || (entry.phonetics || []).find(item => item.text)?.text || "";
  titleWrap.appendChild(makeElement("p", "phonetic", phonetic || "Pronunciation not provided"));
  head.appendChild(titleWrap);

  const audio = (entry.phonetics || []).find(item => item.audio)?.audio;
  if (audio) {
    const audioButton = makeElement("button", "audio-button", "▶");
    audioButton.type = "button";
    audioButton.setAttribute("aria-label", "Play pronunciation");
    audioButton.addEventListener("click", () => {
      const player = new Audio(audio);
      player.play().catch(() => showStatus("Audio could not be played on this device.", "error"));
    });
    head.appendChild(audioButton);
  }
  card.appendChild(head);

  (entry.meanings || []).forEach(meaning => {
    card.appendChild(makeElement("span", "part-of-speech", meaning.partOfSpeech || "Meaning"));
    (meaning.definitions || []).slice(0, 4).forEach((definition, index) => {
      const block = makeElement("div", "definition");
      block.appendChild(makeElement("p", "", `${index + 1}. ${definition.definition || "No definition provided."}`));
      if (definition.example) block.appendChild(makeElement("p", "example", `Example: “${definition.example}”`));
      block.appendChild(document.createElement("div"));
      card.appendChild(block);
    });
  });
  return card;
}

async function searchWord(rawWord) {
  const word = rawWord.trim();
  if (!word) {
    showStatus("Please enter a word before searching.", "error");
    input.focus();
    return;
  }
  if (!/^[a-zA-Z][a-zA-Z '-]*$/.test(word)) {
    showStatus("Please enter an English word using letters, spaces, apostrophes, or hyphens.", "error");
    return;
  }

  resultsBox.replaceChildren();
  searchButton.disabled = true;
  searchButton.textContent = "Searching…";
  showStatus(`Looking up “${word}”…`, "loading");

  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (response.status === 404) {
      throw new Error(`We couldn't find “${word}”. Check the spelling or try another word.`);
    }
    if (!response.ok) {
      throw new Error("The dictionary service is temporarily unavailable. Please try again.");
    }
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No dictionary results were returned. Please try another word.");
    }
    data.forEach(entry => resultsBox.appendChild(addDefinitionSection(entry)));
    showStatus(`Found ${data.length} result${data.length === 1 ? "" : "s"} for “${word}”.`);
  } catch (error) {
    const message = error instanceof TypeError
      ? "Could not fetch data. Please check your internet connection and try again."
      : error.message || "Something went wrong. Please try again.";
    showStatus(message, "error");
  } finally {
    searchButton.disabled = false;
    searchButton.innerHTML = 'Search <span aria-hidden="true">→</span>';
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  searchWord(input.value);
});

document.querySelectorAll(".suggestion").forEach(button => {
  button.addEventListener("click", () => {
    input.value = button.dataset.word;
    searchWord(button.dataset.word);
  });
});
