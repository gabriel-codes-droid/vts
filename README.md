# 🚀 Portfolio-Astro

A dynamic **3D portfolio website** built to showcase creative work, current and past projects, and the developer behind the code. 

[![Astro Version](https://shields.io)](https://astro.build)
[![License: MIT](https://shields.io)](https://opensource.org)
[![Maintenance](https://shields.io)](https://github.com/)

---

## ✨ Features

- **3D Interactive Elements:** Immersive visual experience to instantly capture user attention.
- **Project Showcase:** Highlights current experiments and deep-dive historic case studies.
- **About the Developer:** Dedicated space sharing background, technical skills, and experience.
- **Blazing Fast Performance:** Built on top of Astro's zero-JS-by-default architecture for optimal SEO and speed.

---

## 🛠️ Tech Stack

- **Framework:** [Astro](https://astro.build/) (Static Site Generation & Performance)
- **3D Graphics:** Three.js / React Three Fiber (or your specific 3D library)
- **Styling:** Tailwind CSS (or your choice of styling)

---

## 🚀 Getting Started

Follow these quick steps to get a local copy of the project up and running.

### Prerequisites

Make sure you have Node.js installed on your machine:
* **Node.js** (v18 or higher recommended)
* **npm** or **pnpm / yarn**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com
   ```

2. **Navigate into the project directory:**
   ```bash
   cd portfolio_astro
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

### Running Locally

To fire up the local development server and view your 3D portfolio live:

```bash
npm run dev
```
Open **http://localhost:4321** in your browser to see the result!

---

## Contact form

The large email address and arrow open the in-page compose panel. Contact cards are selected by clicking, and their action links open their destinations; the Email card uses `mailto:` to open the visitor's email app. The composer also includes that fallback.

Copy `.env.example` to `.env`, add a Resend API key, and set `RESEND_FROM_EMAIL` to a verified sender. Never commit the key. Secrets are read only on the server at runtime, not embedded in either build bundle. Build and run the server output with `npm run build` followed by `npm start`; the start command loads the local `.env` if present. In production, set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in the hosting provider's server environment. Pushing code does not configure those secrets on the host. Resend's default `onboarding@resend.dev` sender is for testing to the Resend account owner's email; use a verified domain for production.

## 🌐 Live Demo

Feel free to explore the interactive live website!

👉 **[FEEL FREE TO CHECK IT OUT HERE](https://your-live-portfolio-link.com)**

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
