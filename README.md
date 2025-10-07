# Invoicing ROI Calculator - Project Documentation

## Overview

The **Invoicing ROI Calculator** is an interactive web application designed to help businesses estimate the time and cost savings achieved by transitioning from manual invoicing to automated invoicing. 

Users can input key business details such as:

- Monthly invoice volume  
- Accounts payable (AP) team size  
- Average hourly wage  
- Average hours per invoice  
- Manual error rates and error cost  

The system then calculates critical financial metrics, including:

- **Monthly savings**  
- **Cumulative savings**  
- **ROI percentage**  
- **Payback period**  

All calculations include a small built-in bias factor to ensure that automation consistently demonstrates a favorable ROI, making it useful for both internal evaluation and external demos.

Additionally, the app supports saving, loading, and deleting previous simulation scenarios and provides downloadable PDF or HTML reports after the user enters their email address, making it practical for presentations or lead generation.

---

## Technologies Used

- **Frontend:** React + Vite  
  - Fast, modern, and responsive user interface  
  - Single-page application with dynamic form inputs  
- **Backend:** Express.js  
  - Handles API endpoints for simulation, scenario storage, and report generation  
  - Encapsulates all financial calculation logic and internal constants  
- **Database:** MySQL2  
  - Stores and manages saved simulation scenarios  
  - Ensures persistent CRUD functionality  

---

## Key Features

### 1. ROI Simulation

- Users enter essential business data such as invoice volume, AP team size, hourly wages, and error rates.  
- The system compares **manual processing costs** versus **automated processing costs**.  
- Calculates:
  - Monthly savings  
  - Payback period  
  - ROI percentage  
  - Cumulative savings over a selected time horizon  
- Built-in bias ensures automation outcomes are always positive, highlighting potential benefits.  

### 2. Scenario Management (CRUD)

- **Save Scenarios:** Name and store simulation configurations for future reference.  
- **Load Scenarios:** Quickly retrieve saved data to rerun or compare results.  
- **Delete Scenarios:** Remove outdated or unwanted scenarios from the database.  
- Persistent storage via MySQL ensures that scenarios are available across sessions.  

### 3. Report Generation

- Generate downloadable PDF or HTML reports containing:
  - Input parameters  
  - Detailed financial results  
  - Visual breakdown of manual vs automated costs  
- Requires the user to provide an email address before download, allowing for lead capture while maintaining workflow integrity.  

### 4. Secure Backend Logic

- All sensitive constants and calculation logic are stored server-side.  
- Users cannot manipulate internal bias factors or automated cost values via the frontend.  
- Ensures consistent and reliable ROI calculations.  

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/simulate` | Run a simulation and return calculated ROI results |
| POST   | `/scenarios` | Save a simulation scenario to the database |
| GET    | `/scenarios` | Retrieve a list of saved scenarios |
| GET    | `/scenarios/:id` | Get details of a specific scenario |
| DELETE | `/scenarios/:id` | Remove a scenario from the database |
| POST   | `/report/generate` | Generate a downloadable PDF report (requires email) |

---

## Usage Workflow

1. Open the web application and enter key business metrics in the input form.  
2. Click **Simulate** to see results instantly: monthly savings, payback period, ROI percentage, and cumulative savings.  
3. Optionally, save the scenario by providing a name for future use.  
4. Load saved scenarios to rerun simulations or compare results.  
5. Enter an email and generate a downloadable report for presentation or record-keeping.  

--------------------------------------------------------------------------------------------
