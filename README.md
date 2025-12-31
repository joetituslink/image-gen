# Image Gen App

A powerful featured image generator with customizable templates and text overlays. Perfect for creating blog headers, social media graphics, and promotional images.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

- **6 Beautiful Templates** - Classic, Modern Dark, Minimal, Vibrant, Editorial, and Prayer Cover
- **Custom Background Images** - Upload your own or use template defaults
- **Color Customization** - Override template colors for banner, category, and title
- **REST API** - Programmatic access for automation and integrations
- **Auto-cleanup** - Generated images are automatically deleted after 30 minutes
- **Production Ready** - Easy environment-based configuration

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd image-gen

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
```

### Configuration

Create a `.env` file in the root directory (use `.env.example` as a template).

| Variable          | Description                       | Default                    |
| ----------------- | --------------------------------- | -------------------------- |
| `APP_NAME`        | Name of the application (Server)  | `Image Gen App`            |
| `PORT`            | API Server port                   | `3001`                     |
| `BASE_URL`        | Base URL for images in production | _Auto-detected_            |
| `CORS_ORIGINS`    | Allowed origins for API access    | `*`                        |
| `CLEANUP_ENABLED` | Enable automatic image deletion   | `true`                     |
| `VITE_API_URL`    | API URL for frontend during dev   | `http://localhost:3001`    |
| `VITE_APP_NAME`   | Display name in the frontend      | `Featured Image Generator` |

### Development

```bash
# Run both frontend and API server
npm run dev:all

# Or run separately:
npm run dev       # Frontend only (http://localhost:8080)
npm run dev:api   # API only (http://localhost:3001)
```

### Production

```bash
# Build the frontend
npm run build

# Start the API server
npm start
```

## 📋 Available Templates

| Template         | ID            | Description                                         |
| ---------------- | ------------- | --------------------------------------------------- |
| **Classic**      | `classic`     | Clean centered banner with elegant serif typography |
| **Modern Dark**  | `modernDark`  | Bold dark theme with vibrant gradient accents       |
| **Minimal**      | `minimal`     | Ultra clean design with subtle bottom accent        |
| **Vibrant**      | `vibrant`     | Colorful gradient background with floating card     |
| **Editorial**    | `editorial`   | Magazine-style layout with bold typography          |
| **Prayer Cover** | `prayerCover` | Spiritual themed cover with soft pink-cyan gradient |

## 🔧 API Reference

### Base URL

- Development: `http://localhost:3001`
- Production: Configure via `BASE_URL` environment variable

### Endpoints

#### List Templates

```http
GET /api/templates
```

**Response:**

```json
{
  "success": true,
  "templates": [
    {
      "id": "classic",
      "name": "Classic",
      "description": "Clean centered banner with elegant serif typography",
      "preview": {
        "bgGradient": ["#e8e4df", "#d4cfc9"],
        "accentColor": "#c67c4e"
      }
    }
  ]
}
```

#### Generate Image

```http
POST /api/generate-image
Content-Type: application/json
```

**Request Body:**

```json
{
  "templateId": "classic",
  "categoryText": "HEALTH AND WELLNESS",
  "mainText": "How to Have a Better Work-Life Balance",
  "bgImageUrl": "https://example.com/image.jpg",
  "bgImageBase64": "data:image/png;base64,...",
  "bannerColor": "#ffffff",
  "bannerOpacity": 0.85,
  "categoryColor": "#c67c4e",
  "titleColor": "#1a1a1a"
}
```

| Parameter       | Type   | Required | Default          | Description                     |
| --------------- | ------ | -------- | ---------------- | ------------------------------- |
| `mainText`      | string | ✅ Yes   | -                | Main title text                 |
| `templateId`    | string | No       | `"classic"`      | Template ID to use              |
| `categoryText`  | string | No       | `"CATEGORY"`     | Category/subtitle text          |
| `bgImageUrl`    | string | No       | -                | URL to background image         |
| `bgImageBase64` | string | No       | -                | Base64 encoded background image |
| `bannerColor`   | string | No       | Template default | Banner color (hex)              |
| `bannerOpacity` | number | No       | Template default | Banner opacity (0-1)            |
| `categoryColor` | string | No       | Template default | Category text color (hex)       |
| `titleColor`    | string | No       | Template default | Title text color (hex)          |

**Response:**

```json
{
  "success": true,
  "downloadUrl": "http://localhost:3001/images/featured-image-1234567890.webp",
  "filename": "featured-image-1234567890.webp"
}
```

#### Health Check

```http
GET /api/health
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "config": {
    "cleanup": true,
    "cleanupMaxAgeMinutes": 30
  }
}
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root for configuration:

```bash
# Server Configuration
PORT=3001                          # API server port
BASE_URL=https://api.yourdomain.com # Base URL for generated image URLs

# CORS Configuration
CORS_ORIGINS=*                     # Allowed origins (* for all, or comma-separated list)
# CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Request Size
MAX_REQUEST_SIZE=10mb              # Maximum request body size

# Auto-cleanup Configuration
CLEANUP_ENABLED=true               # Enable/disable auto-cleanup
CLEANUP_INTERVAL_MINUTES=5         # How often to check for old files
CLEANUP_MAX_AGE_MINUTES=30         # Delete files older than this
```

### Frontend Configuration

```bash
# In .env or .env.local for frontend
VITE_API_URL=http://localhost:3001  # API URL for frontend
```

## 🚢 Deployment

### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the API server
pm2 start server/index.js --name "image-gen-api"

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

### Using Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY server ./server

ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "server/index.js"]
```

```bash
# Build and run
docker build -t image-gen-app .
docker run -p 3001:3001 -e BASE_URL=https://api.yourdomain.com image-gen-app
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeout for image generation
        proxy_read_timeout 60s;
    }
}
```

### Production Checklist

- [ ] Set `BASE_URL` environment variable to your production domain
- [ ] Configure `CORS_ORIGINS` to only allow your frontend domain(s)
- [ ] Set up SSL/TLS (HTTPS) via reverse proxy
- [ ] Configure appropriate `CLEANUP_MAX_AGE_MINUTES` based on your needs
- [ ] Set up process manager (PM2, systemd) for auto-restart
- [ ] Configure log rotation
- [ ] Set up monitoring and alerts

## 📁 Project Structure

```
image-gen/
├── server/
│   ├── index.js           # Express API server
│   ├── generateImage.js   # Image generation logic
│   ├── templates.js       # Template configurations
│   ├── assets/            # Template background images
│   │   └── prayer-bg.png
│   └── generated/         # Generated images (auto-cleaned)
├── src/
│   ├── components/
│   │   └── FeaturedImageGenerator.tsx  # Main UI component
│   ├── pages/
│   └── ...
├── package.json
└── README.md
```

## 🎨 Adding Custom Templates

Edit `server/templates.js` to add new templates:

```javascript
export const templates = {
  // ... existing templates

  myCustomTemplate: {
    id: "myCustomTemplate",
    name: "My Custom Template",
    description: "Description of your template",
    preview: {
      bgGradient: ["#color1", "#color2"],
      accentColor: "#accentColor",
    },
    config: {
      canvas: { width: 1200, height: 630 },
      background: {
        type: "gradient", // or "solid" or "image"
        gradient: {
          type: "linear",
          angle: 45,
          stops: [
            { offset: 0, color: "#color1" },
            { offset: 1, color: "#color2" },
          ],
        },
      },
      banner: {
        type: "centered",
        height: 340,
        padding: 100,
        defaultColor: "#ffffff",
        defaultOpacity: 0.85,
      },
      category: {
        font: "500 24px Arial, sans-serif",
        defaultColor: "#accentColor",
        textTransform: "uppercase",
        letterSpacing: 4,
        offsetY: 70,
      },
      title: {
        font: "400 64px Georgia, serif",
        defaultColor: "#1a1a1a",
        lineHeight: 80,
        offsetY: 80,
        maxWidth: -160,
      },
    },
  },
};
```

## 📝 Examples

### cURL

```bash
# Generate image with default template
curl -X POST http://localhost:3001/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{"mainText": "My Amazing Blog Post"}'

# Generate with specific template
curl -X POST http://localhost:3001/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "modernDark",
    "categoryText": "TECHNOLOGY",
    "mainText": "The Future of AI"
  }'
```

### JavaScript/Fetch

```javascript
const response = await fetch("http://localhost:3001/api/generate-image", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    templateId: "vibrant",
    categoryText: "LIFESTYLE",
    mainText: "Living Your Best Life",
    categoryColor: "#ff6b6b",
  }),
});

const { downloadUrl } = await response.json();
console.log("Image URL:", downloadUrl);
```

### Python

```python
import requests

response = requests.post(
    'http://localhost:3001/api/generate-image',
    json={
        'templateId': 'editorial',
        'categoryText': 'NEWS',
        'mainText': 'Breaking: Important Update',
    }
)

data = response.json()
print(f"Image URL: {data['downloadUrl']}")
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/), [Express](https://expressjs.com/), and [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
