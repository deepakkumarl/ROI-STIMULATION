import React, { useState, useEffect } from 'react';
import './index.css';
import axios from 'axios';

const API_BASE = 'https://twelve-shrimps-beam.loca.lt'; // LocalTunnel temporary URL

function App() {
  const [formData, setFormData] = useState({
    scenario_name: '',
    monthly_invoice_volume: '',
    num_ap_staff: '',
    avg_hours_per_invoice: '',
    hourly_wage: '',
    error_rate_manual: '',
    error_cost: '',
    time_horizon_months: '',
    one_time_implementation_cost: '',
    email: ''
  });

  const [results, setResults] = useState(null);
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [message, setMessage] = useState('');

  const fetchScenarios = async () => {
    try {
      const res = await axios.get(`${API_BASE}/scenarios`);
      setSavedScenarios(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleSimulate = async () => {
    try {
      const res = await axios.post(`${API_BASE}/simulate`, formData);
      setResults(res.data);
      setMessage('');
    } catch (err) {
      console.error(err);
      setMessage('Simulation failed.');
    }
  };

  const handleSaveScenario = async () => {
    if (!formData.scenario_name) {
      setMessage('Scenario name is required.');
      return;
    }
    try {
      await axios.post(`${API_BASE}/scenarios`, formData);
      setMessage('Scenario saved!');
      fetchScenarios();
    } catch (err) {
      console.error(err);
      setMessage('Failed to save scenario.');
    }
  };

  const handleLoadScenario = (scenario) => {
    setFormData(scenario);
    setResults(null);
    setMessage('');
  };

  const handleDeleteScenario = async (id) => {
    try {
      await axios.delete(`${API_BASE}/scenarios/${id}`);
      setMessage('Scenario deleted.');
      fetchScenarios();
    } catch (err) {
      console.error(err);
      setMessage('Failed to delete scenario.');
    }
  };

  const handleDownloadReport = async () => {
    if (!formData.email) {
      setMessage('Email is required to download report.');
      return;
    }
    try {
      const res = await axios.post(`${API_BASE}/report/generate`, formData, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${formData.scenario_name}_report.pdf`);
      document.body.appendChild(link);
      link.click();
      setMessage('');
    } catch (err) {
      console.error(err);
      setMessage('Failed to generate report.');
    }
  };

  const resetForm = () => {
    setFormData({
      scenario_name: '',
      monthly_invoice_volume: '',
      num_ap_staff: '',
      avg_hours_per_invoice: '',
      hourly_wage: '',
      error_rate_manual: '',
      error_cost: '',
      time_horizon_months: '',
      one_time_implementation_cost: '',
      email: ''
    });
    setResults(null);
    setMessage('');
  };

  return (
    <div className="container">
      <h1 className="title">Invoicing ROI Simulator</h1>

      <div className="form-grid">
        {Object.keys(formData).map((key) => key !== 'email' && (
          <div key={key} className="form-group">
            <label className="form-label">{key.replace(/_/g, ' ')}</label>
            <input
              type="text"
              name={key}
              value={formData[key]}
              onChange={handleChange}
              className="form-input"
            />
          </div>
        ))}
      </div>

      <div className="button-row">
        <button className="btn btn-primary" onClick={handleSimulate}>Simulate</button>
        <button className="btn btn-secondary" onClick={handleSaveScenario}>Save Scenario</button>
        <button className="btn btn-reset" onClick={resetForm}>Reset</button>
      </div>

      {results && (
        <div className="results-box">
          <h2>Results</h2>
          <p><strong>Monthly Savings:</strong> ${results.monthly_savings}</p>
          <p><strong>Payback Months:</strong> {results.payback_months}</p>
          <p><strong>ROI Percentage:</strong> {results.roi_percentage}%</p>
          <p><strong>Cumulative Savings:</strong> ${results.cumulative_savings}</p>

          <input
            type="text"
            name="email"
            placeholder="Enter Email"
            value={formData.email}
            onChange={handleChange}
            className="form-input email-input"
          />
          <button className="btn btn-download" onClick={handleDownloadReport}>Download Report</button>
        </div>
      )}

      {message && <div className="message">{message}</div>}

      <div className="saved-scenarios">
        <h3>Saved Scenarios</h3>
        <ul>
          {savedScenarios.map((s) => (
            <li key={s.id} className="scenario-item">
              <span>{s.scenario_name}</span>
              <div className="scenario-buttons">
                <button className="btn btn-load" onClick={() => handleLoadScenario(s)}>Load</button>
                <button className="btn btn-delete" onClick={() => handleDeleteScenario(s.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
