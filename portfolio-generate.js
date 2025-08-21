const { createClient } = require('@supabase/supabase-js');
const archiver = require('archiver');
const handlebars = require('handlebars');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Portfolio HTML template
const portfolioTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{name}} - {{title}}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 2rem 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; margin-bottom: 2rem; }
        .profile-photo { width: 150px; height: 150px; border-radius: 50%; margin: 0 auto 1rem; object-fit: cover; border: 5px solid white; }
        .name { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .title { font-size: 1.2rem; opacity: 0.9; }
        .contact { margin: 1rem 0; }
        .section { margin: 2rem 0; }
        .section h2 { color: #667eea; margin-bottom: 1rem; border-bottom: 2px solid #667eea; padding-bottom: 0.5rem; }
        .bio { font-size: 1.1rem; line-height: 1.8; }
        .skills { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .skill { background: #667eea; color: white; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.9rem; }
        .projects { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
        .project { border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .project h3 { color: #667eea; margin-bottom: 0.5rem; }
        .social-links { display: flex; gap: 1rem; justify-content: center; margin-top: 1rem; }
        .social-links a { color: white; text-decoration: none; padding: 0.5rem 1rem; background: rgba(255,255,255,0.2); border-radius: 20px; }
        @media (max-width: 768px) { .projects { grid-template-columns: 1fr; } .name { font-size: 2rem; } }
    </style>
</head>
<body>
    <div class="header">
        {{#if profilePhoto}}
        <img src="{{profilePhoto}}" alt="{{name}}" class="profile-photo">
        {{/if}}
        <h1 class="name">{{name}}</h1>
        <p class="title">{{title}}</p>
        <div class="contact">
            <p>📧 {{email}}</p>
            {{#if phone}}<p>📱 {{phone}}</p>{{/if}}
        </div>
        <div class="social-links">
            {{#if socialLinks.github}}<a href="{{socialLinks.github}}" target="_blank">GitHub</a>{{/if}}
            {{#if socialLinks.linkedin}}<a href="{{socialLinks.linkedin}}" target="_blank">LinkedIn</a>{{/if}}
            {{#if socialLinks.twitter}}<a href="{{socialLinks.twitter}}" target="_blank">Twitter</a>{{/if}}
            {{#if socialLinks.website}}<a href="{{socialLinks.website}}" target="_blank">Website</a>{{/if}}
        </div>
    </div>
    
    <div class="container">
        <div class="section">
            <h2>About Me</h2>
            <p class="bio">{{bio}}</p>
        </div>
        
        {{#if skills}}
        <div class="section">
            <h2>Skills</h2>
            <div class="skills">
                {{#each skills}}
                <span class="skill">{{this}}</span>
                {{/each}}
            </div>
        </div>
        {{/if}}
        
        {{#if projects}}
        <div class="section">
            <h2>Projects</h2>
            <div class="projects">
                {{#each projects}}
                <div class="project">
                    <h3>{{name}}</h3>
                    <p>{{description}}</p>
                    {{#if technologies}}<p><strong>Technologies:</strong> {{technologies}}</p>{{/if}}
                    {{#if url}}<p><a href="{{url}}" target="_blank">View Project</a></p>{{/if}}
                    {{#if github}}<p><a href="{{github}}" target="_blank">Source Code</a></p>{{/if}}
                </div>
                {{/each}}
            </div>
        </div>
        {{/if}}
    </div>
</body>
</html>
`;

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
    const { portfolioId } = JSON.parse(event.body);

    if (!portfolioId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Portfolio ID is required' })
      };
    }

    // Fetch portfolio data
    const { data: portfolio, error } = await supabase
      .from('portfolios')
      .select(`
        *,
        projects (*)
      `)
      .eq('id', portfolioId)
      .single();

    if (error) {
      throw error;
    }

    // Compile template
    const template = handlebars.compile(portfolioTemplate);
    const html = template({
      ...portfolio,
      socialLinks: portfolio.social_links || {}
    });

    // Create ZIP archive in memory
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];

    archive.on('data', (chunk) => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      archive.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        
        resolve({
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${portfolio.name.replace(/[^a-zA-Z0-9]/g, '_')}_portfolio.zip"`
          },
          body: base64,
          isBase64Encoded: true
        });
      });

      archive.on('error', reject);

      // Add files to archive
      archive.append(html, { name: 'index.html' });
      archive.append(JSON.stringify(portfolio, null, 2), { name: 'portfolio-data.json' });
      
      // Finalize the archive
      archive.finalize();
    });

  } catch (error) {
    console.error('Error generating portfolio:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate portfolio' })
    };
  }
};
