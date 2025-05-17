import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const NotFound: React.FC = () => {
  return (
    <Layout>
      <div className="page-transition flex flex-col items-center justify-center py-16">
        <div className="text-center">
          <h1 className="text-8xl font-bold text-red-600 mb-4">404</h1>
          <h2 className="text-3xl font-semibold text-white mb-6">Página não encontrada</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            A página que você está procurando não existe ou foi movida.
          </p>
          
          <Link 
            to="/" 
            className="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition-colors inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            Voltar para o Dashboard
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound; 