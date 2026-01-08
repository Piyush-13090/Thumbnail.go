# Thumblify

Thumblify is an advanced AI-powered thumbnail generation platform that leverages multiple state-of-the-art AI models (OpenAI DALL-E 3, Anthropic Claude, Google Gemini, and more) to create stunning YouTube thumbnails and other visuals effortlessly.

## 🚀 Features

-   **Multi-Model Intelligence**: Generate high-quality images using OpenAI DALL-E 3, Anthropic Claude, Google Gemini, Hugging Face, and others.
-   **Modern & Responsive UI**: Built with **React 19**, **TailwindCSS 4**, and **Framer Motion** for a seamless, beautiful, and interactive user experience.
-   **Smart User Management**: Secure authentication system to manage user sessions and keep your creations private.
-   **My Generations Gallery**: Automatically save, retrieve, and manage your history of generated thumbnails.
-   **Cloud Integration**: Seamless image hosting and management via Cloudinary.
-   **One-Click Download**: Easily download your generated masterpieces.
-   **Feedback System**: Integrated contact form for direct user support and feedback.

## 🛠️ Tech Stack

### Frontend
-   **Framework**: React 19 (Vite)
-   **Styling**: TailwindCSS 4
-   **Animations**: Framer Motion
-   **Routing**: React Router DOM v7
-   **HTTP Client**: Axios
-   **Icons**: Lucide React

### Backend
-   **Runtime**: Node.js & Express
-   **Language**: TypeScript
-   **Database**: MongoDB (via Mongoose)
-   **Session Management**: Express Session & Connect Mongo
-   **Security**: BCryptJS & CORS
-   **AI Integration**: OpenAI SDK, Anthropic SDK, and custom controllers for other providers

## ⚙️ Installation & Setup

Follow these steps to get the project running on your local machine.

### Prerequisites
-   Node.js (v18+ recommended)
-   MongoDB (Local instance or MongoDB Atlas)
-   API Keys for your desired AI providers (e.g., OpenAI, Anthropic)
-   Cloudinary Account

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/thumblify.git
cd thumblify
```

### 2. Backend Setup
Navigate to the `server` directory and install dependencies:
```bash
cd server
npm install
```

Create a `.env` file in the `server` directory with the following variables:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
SECRET_KEY=your_session_secret_key
NODE_ENV=development

# AI Provider Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
# Add other keys as needed (GOOGLE_GENAI_API_KEY, HUGGINGFACE_API_KEY, etc.)

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Configuration (Optional)
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
```

Start the backend server:
```bash
npm run server
```
The server will start at `http://localhost:3000`.

### 3. Frontend Setup
Open a new terminal window, navigate to the `clint` (client) directory, and install dependencies:
```bash
cd clint
npm install
```

Start the development server:
```bash
npm run dev
```

The application should now be running at `http://localhost:5173` (or the port shown in your terminal).

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License
This project is licensed under the ISC License.
