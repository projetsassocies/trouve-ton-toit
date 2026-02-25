const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { prompt, messages: incomingMessages, response_json_schema, tools } = await req.json()

    if (!prompt && !incomingMessages) {
      return Response.json(
        { error: 'prompt or messages is required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      return Response.json(
        { error: 'OPENAI_API_KEY not configured in Supabase secrets' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    let messages: Array<{ role: string; content: string | null; tool_calls?: unknown[]; tool_call_id?: string }>

    if (incomingMessages) {
      messages = incomingMessages
    } else if (response_json_schema) {
      messages = [
        {
          role: 'system',
          content: 'Tu es un assistant expert. Réponds UNIQUEMENT en JSON valide, sans markdown ni commentaire.',
        },
        { role: 'user', content: prompt },
      ]
    } else {
      messages = [
        {
          role: 'system',
          content: 'Tu es un assistant professionnel et utile. Réponds de manière claire et concise.',
        },
        { role: 'user', content: prompt },
      ]
    }

    const body: Record<string, unknown> = {
      model: 'gpt-4o-mini',
      messages,
      temperature: response_json_schema ? 0.1 : 0.7,
    }

    if (response_json_schema) {
      body.response_format = { type: 'json_object' }
    }

    if (tools && tools.length > 0) {
      body.tools = tools
      body.tool_choice = 'auto'
    }

    const llmResponse = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify(body),
      }
    )

    if (!llmResponse.ok) {
      const errBody = await llmResponse.text()
      console.error('[invoke-llm] OpenAI error:', errBody)
      return Response.json(
        { error: `OpenAI API error: ${llmResponse.status}`, details: errBody },
        { status: 502, headers: CORS_HEADERS }
      )
    }

    const llmData = await llmResponse.json()
    const choice = llmData.choices?.[0]

    if (!choice) {
      return Response.json(
        { error: 'Empty response from LLM' },
        { status: 502, headers: CORS_HEADERS }
      )
    }

    if (choice.finish_reason === 'tool_calls' || choice.message?.tool_calls) {
      return Response.json({
        content: choice.message?.content || null,
        tool_calls: choice.message.tool_calls,
        finish_reason: 'tool_calls',
      }, { headers: CORS_HEADERS })
    }

    const content = choice.message?.content

    if (!content) {
      return Response.json(
        { error: 'Empty content from LLM' },
        { status: 502, headers: CORS_HEADERS }
      )
    }

    if (response_json_schema) {
      try {
        const parsed = JSON.parse(content)
        return Response.json(parsed, { headers: CORS_HEADERS })
      } catch {
        console.error('[invoke-llm] Failed to parse JSON:', content)
        return Response.json(
          { error: 'LLM returned invalid JSON', raw: content },
          { status: 502, headers: CORS_HEADERS }
        )
      }
    }

    if (tools && tools.length > 0) {
      return Response.json({
        content,
        tool_calls: null,
        finish_reason: choice.finish_reason || 'stop',
      }, { headers: CORS_HEADERS })
    }

    return Response.json(content, { headers: CORS_HEADERS })
  } catch (error) {
    console.error('[invoke-llm] Error:', error.message)
    return Response.json(
      { error: error.message },
      { status: 500, headers: CORS_HEADERS }
    )
  }
})
