const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Extract portfolio ID from path
    const pathParts = event.path.split('/');
    const portfolioId = pathParts[pathParts.length - 1];

    if (!portfolioId || portfolioId === 'portfolio-delete') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Portfolio ID is required' })
      };
    }

    // Delete portfolio (projects will be deleted automatically due to CASCADE)
    const { error } = await supabase
      .from('portfolios')
      .delete()
      .eq('id', portfolioId);

    if (error) {
      throw error;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Portfolio deleted successfully' })
    };

  } catch (error) {
    console.error('Error deleting portfolio:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to delete portfolio' })
    };
  }
};
