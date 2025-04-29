# Financial Risk Management Dashboard

A modern React-based frontend for the Financial Risk API, providing real-time transaction monitoring, anomaly detection, and risk analysis.

## Features

- **Real-time Transaction Monitoring:** Monitor transactions in real-time through WebSocket connection
- **Anomaly Detection:** Visualize and analyze anomalous transactions 
- **Dashboard Analytics:** Get a comprehensive overview with interactive charts and statistics
- **Filtering & Searching:** Easily filter and search transactions by various criteria

## Technologies Used

- React 18
- Material UI 5
- React Router 6
- Axios for API calls
- ApexCharts for data visualization
- WebSockets for real-time updates

## Getting Started

### Prerequisites

- Node.js 14.x or higher
- Financial Risk API backend (Neo4j-based)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/financial-risk-frontend.git
cd financial-risk-frontend
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

- `/src/api` - API service interfaces to connect with the backend
- `/src/components` - Reusable React components
- `/src/context` - React Context for state management
- `/src/pages` - Main application pages
- `/src/utils` - Utility functions and helpers

## Backend API Integration

This frontend is designed to work with the Financial Risk API backend. The following endpoints are utilized:

- `POST /dev/generate_and_train` - Generate synthetic data and train models
- `POST /transactions/process` - Process a batch of transactions
- `GET /customers/{customer_id}/behavior` - Get customer behavioral patterns
- `GET /merchants/{merchant_id}/risk` - Get merchant risk score
- `POST /models/train` - Retrain the ML models
- `GET /health` - API health check
- `WebSocket /ws` - Real-time transaction updates

## License

MIT

## Acknowledgements

- [Material UI](https://mui.com/)
- [ApexCharts](https://apexcharts.com/)
- [React Router](https://reactrouter.com/)
- [Neo4j](https://neo4j.com/) 