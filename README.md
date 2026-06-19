# AI Study Assistant 🎓

A responsive web application that uses the **Google Gemini API** to generate structured
learning material for any topic a student enters.

---

## ✨ Features

| Feature | Details |
|---|---|
| **AI Content Generation** | Detailed notes, summary, 5 quiz Q&As, key points, study tips |
| **Search History** | Saved in `localStorage`; click any item to reload it |
| **Dark / Light Mode** | Toggle in the navbar; preference persisted across sessions |
| **Responsive Design** | Mobile-first; Bootstrap 5 grid system |
| **Loading States** | Spinner on button while API fetches |
| **Error Handling** | Empty input validation, API error messages, dismissible alerts |
| **Quiz Reveal** | Show/hide answers on demand with slide animation |

---

## 🛠 Tech Stack

- **HTML5** — semantic structure
- **CSS3** — custom design tokens, smooth transitions, dark mode via `data-theme`
- **Bootstrap 5** — grid, components, utilities
- **JavaScript ES6** — async/await, modules, DOM manipulation
- **jQuery 3** — event handling, animations, AJAX calls
- **Google Gemini API** — `gemini-1.5-flash` model via REST
- **Local Storage** — history + theme preference persistence

---

## 📁 File Structure

```
AI-Study-Assistant/
├── index.html          # Main HTML — layout, navbar, hero, modals
├── css/
│   └── style.css       # All styles — design tokens, components, dark mode
├── js/
│   └── script.js       # All logic — API, history, theme, rendering
├── assets/
│   └── images/         # (placeholder for any custom images)
└── README.md
```

---

## 🚀 Installation & Setup

### 1. Get a free Gemini API key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with a Google account
3. Click **Create API Key** and copy it

### 2. Add your API key
Open `js/script.js` and replace the placeholder:

```js
const CONFIG = {
  GEMINI_API_KEY : 'YOUR_GEMINI_API_KEY_HERE',  // ← paste your key here
  ...
};
```

### 3. Open the project
- Open `index.html` directly in a browser, **or**
- Serve it locally with [VS Code Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)

> ⚠️ **Never commit your real API key to a public repository.**

---

## 📖 How to Use

1. **Enter a topic** in the text field (e.g. *"Photosynthesis"*, *"Binary Trees"*, *"World War II"*)
2. Click **Generate** (or press Enter)
3. Wait ~3–5 seconds for the Gemini API to respond
4. Read through:
   - 📝 Detailed Notes
   - 📄 Short Summary
   - 🔑 Key Points
   - ❓ Quiz Questions (click *Show Answer* to reveal)
   - 💡 Study Tips
5. Previous topics appear in the **History** sidebar — click any to reload

---

## 🔮 Future Enhancements

- [ ] Export content to PDF
- [ ] Flashcard mode (spaced repetition)
- [ ] Audio text-to-speech read-aloud
- [ ] Multiple languages via Gemini's multilingual support
- [ ] User accounts with cloud history sync
- [ ] Difficulty selector (beginner / intermediate / advanced)
- [ ] Image generation to illustrate topics

---

## 📝 Assignment Notes

This project was built as a university Front-End Development assignment demonstrating:

- Semantic **HTML5** structure
- Custom **CSS3** with design tokens and dark mode
- **Bootstrap 5** responsive grid and components
- **JavaScript ES6** (async/await, arrow functions, template literals, destructuring)
- **jQuery** for DOM manipulation, events, and animations
- **Google Gemini REST API** integration with structured prompting
- **Local Storage** for persistent history and theme preference
- Comprehensive **error handling** and loading states
