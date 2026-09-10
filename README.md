# ASP Profiler

ASP Profiler is a web application for analyzing football players' GNSS/GPS session data from STATSports CSV exports. It supports configurable analysis of acceleration-speed profiles (ASP), deceleration-speed profiles (DSP), high-speed running, acceleration and deceleration events, pitch zones, time series, trajectories, and exportable analysis results.

The application uses a client-server architecture:

- `frontend/` - React and Vite frontend for importing files, configuring analysis parameters, normalizing input data, visualizing results, and exporting data.
- `backend/` - FastAPI backend that performs the analysis, validates requests, and handles session-based authentication.

The `data/` directory contains a ZIP archive with two test CSV files that can be used to try the application.

## More Information

- [Frontend README](frontend/README.md)
- [Backend README](backend/README.md)
