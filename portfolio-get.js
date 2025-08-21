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

  if (event.httpMethod !== 'GET') {
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

    if (!portfolioId || portfolioId === 'portfolio-get') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Portfolio ID is required' })
      };
    }

    // Fetch specific portfolio with projects
    const { data: portfolio, error } = await supabase
      .from('portfolios')
      .select(`
        *,
        projects (*)
      `)
      .eq('id', portfolioId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Portfolio not found' })
        };
      }
      throw error;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(portfolio)
    };

  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch portfolio' })
    };
  }
};
