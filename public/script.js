const problemEl = document.getElementById("problem");
const solutionCard = document.getElementById("solution-card");
const outputEl = document.getElementById("solution-output");
const cursorEl = document.getElementById("cursor");
const errorBox = document.getElementById("error-box");
const errorMsg = document.getElementById("error-msg");
const solveBtn = document.getElementById("solve-btn");

// Example buttons
document.querySelectorAll(".example-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    problemEl.value = btn.dataset.problem;
    problemEl.focus();
  });
});

function setLoading(loading) {
  solveBtn.disabled = loading;
  solveBtn.querySelector(".btn-text").textContent = loading
    ? "Solving..."
    : "Solve Problem";
  const arrow = solveBtn.querySelector(".btn-arrow");
  if (loading) {
    arrow.outerHTML = '<span class="spinner"></span>';
  } else {
    document.querySelector(".spinner")?.outerHTML === undefined;
    solveBtn.innerHTML =
      '<span class="btn-text">Solve Problem</span><span class="btn-arrow">&#x2192;</span>';
  }
}

// Render raw text with light markdown formatting
function renderMarkdown(text) {
  // Escape HTML
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headings: ## text
  html = html.replace(/^## (.+)$/gm, '<span class="md-h2">$1</span>');

  // Final answer box: lines containing "**Final Answer**" or "**Answer:**"
  html = html.replace(
    /\*\*(Final Answer[^*]*|Answer[^*]*)\*\*([^\n]*)/g,
    '<div class="answer-box">&#x2713; <strong>$1</strong>$2</div>'
  );

  // SAT Tip box
  html = html.replace(
    /\*\*(SAT Tip[^*]*)\*\*([^\n]*(?:\n(?!\n)[^\n]*)*)/g,
    '<div class="tip-box">&#x1F4A1; <strong>$1</strong>$2</div>'
  );

  // Bold **text**
  html = html.replace(
    /\*\*([^*]+)\*\*/g,
    '<span class="md-bold">$1</span>'
  );

  // Numbered list items: "1. text"
  html = html.replace(
    /^(\d+)\. (.+)$/gm,
    (_, num, content) =>
      `<div class="md-step"><span class="step-num">${num}</span><span>${content}</span></div>`
  );

  return html;
}

async function solve() {
  const problem = problemEl.value.trim();
  if (!problem) {
    problemEl.focus();
    return;
  }

  // Reset UI
  errorBox.style.display = "none";
  solutionCard.style.display = "none";
  outputEl.innerHTML = "";
  cursorEl.classList.remove("hidden");
  setLoading(true);

  let rawText = "";

  try {
    const res = await fetch("/api/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problem }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Request failed.");
    }

    solutionCard.style.display = "block";
    solutionCard.scrollIntoView({ behavior: "smooth", block: "start" });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = JSON.parse(line.slice(6));

        if (payload.error) throw new Error(payload.error);
        if (payload.done) break;
        if (payload.text) {
          rawText += payload.text;
          outputEl.innerHTML = renderMarkdown(rawText);
        }
      }
    }
  } catch (err) {
    solutionCard.style.display = "none";
    errorBox.style.display = "block";
    errorMsg.textContent = err.message || "Something went wrong. Try again.";
  } finally {
    cursorEl.classList.add("hidden");
    setLoading(false);
  }
}

// Ctrl+Enter / Cmd+Enter to solve
problemEl.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") solve();
});

function copySolution() {
  const text = outputEl.innerText;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector(".copy-btn");
    btn.classList.add("copied");
    btn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
    }, 2000);
  });
}
