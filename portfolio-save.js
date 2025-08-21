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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const portfolioData = JSON.parse(event.body);
    
    // Validate required fields
    if (!portfolioData.name || !portfolioData.email || !portfolioData.title || !portfolioData.bio) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Start a transaction
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .insert([{
        name: portfolioData.name,
        title: portfolioData.title,
        email: portfolioData.email,
        phone: portfolioData.phone || null,
        bio: portfolioData.bio,
        skills: portfolioData.skills || [],
        social_links: {
          github: portfolioData.github || '',
          linkedin: portfolioData.linkedin || '',
          twitter: portfolioData.twitter || '',
          website: portfolioData.website || ''
        },
        profile_photo: portfolioData.profilePhoto || null,
        theme: portfolioData.theme || 'modern'
      }])
      .select()
      .single();

    if (portfolioError) {
      throw portfolioError;
    }

    // Insert projects if they exist
    if (portfolioData.projects && portfolioData.projects.length > 0) {
      const projectsToInsert = portfolioData.projects.map(project => ({
        portfolio_id: portfolio.id,
        name: project.name,
        description: project.description,
        technologies: Array.isArray(project.technologies) 
          ? project.technologies.join(', ') 
          : project.technologies || '',
        url: project.url || null,
        github: project.github || null,
        image: project.image || null
      }));

      const { error: projectsError } = await supabase
        .from('projects')
        .insert(projectsToInsert);

      if (projectsError) {
        // Rollback portfolio if projects failed
        await supabase.from('portfolios').delete().eq('id', portfolio.id);
        throw projectsError;
      }
    }

    // Fetch the complete portfolio with projects
    const { data: completePortfolio, error: fetchError } = await supabase
      .from('portfolios')
      .select(`
        *,
        projects (*)
      `)
      .eq('id', portfolio.id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(completePortfolio)
    };

  } catch (error) {
    console.error('Error saving portfolio:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to save portfolio' })
    };
  }
};
