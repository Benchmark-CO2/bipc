import api from '@/service/api';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/_private/upload/projects')({
  component: CsvUploadPage,
})

function CsvUploadPage() {
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResponse(null);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        setError('Please select a file.');
        return;
    }

    let token: string | null = null;
    try {
        const authData = localStorage.getItem('tanstack.auth.token');
        if (authData) {
            token = JSON.parse(authData).token;
        }
    } catch (e) {
        console.error('Error parsing auth token from localStorage', e);
    }

    if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
    }

    setResponse('Uploading...');

    try {
      
      const res = await api.post('/v1/projects-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });


      const data = await res.data;

      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error uploading file:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(errorMessage);
        setResponse(null);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Upload CSV for Units</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">Module Type:</label>
          <select
            id="type"
            name="type"
            required
            defaultValue="concrete_wall"
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 p-2"
          >
            <option value="concrete_wall">Concrete Wall (Parede de Concreto)</option>
            <option value="structural_masonry">Structural Masonry (Alvenaria Estrutural)</option>
            <option value="beam_column">Beam Column (Viga e Pilar)</option>
          </select>
        </div>
        <div className="mb-4">
          <label htmlFor="csv" className="block text-sm font-medium text-gray-700 mb-2">Select CSV file:</label>
          <input 
            type="file" 
            id="csv" 
            name="csv" 
            accept=".csv" 
            required 
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none" 
          />
        </div>
        <button 
          type="submit" 
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Upload
        </button>
      </form>
      {response && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Server Response:</h2>
          <pre className="mt-2 p-4 border rounded bg-gray-50 text-sm">{response}</pre>
        </div>
      )}
      {error && (
        <div className="mt-6">
            <h2 className="text-lg font-semibold text-red-700">Error:</h2>
            <pre className="mt-2 p-4 border rounded bg-red-50 text-red-700 text-sm">{error}</pre>
        </div>
      )}
    </div>
  );
}
