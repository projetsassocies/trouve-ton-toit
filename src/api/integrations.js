import { supabase } from './supabaseClient'

export const InvokeLLM = async ({ prompt, response_json_schema, tools, ...rest }) => {
  const { data, error } = await supabase.functions.invoke('invoke-llm', {
    body: { prompt, response_json_schema, tools, ...rest },
  })
  if (error) {
    let detail = error.message || 'Unknown error'
    if (error.context && typeof error.context.json === 'function') {
      try {
        const body = await error.context.json()
        detail = body.error || JSON.stringify(body)
      } catch {}
    }
    throw new Error(detail)
  }
  return data
}

export const SendEmail = async (payload) => {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: payload,
  })
  if (error) throw error
  return data
}

export const SendSMS = async (payload) => {
  const { data, error } = await supabase.functions.invoke('send-sms', {
    body: payload,
  })
  if (error) throw error
  return data
}

export const UploadFile = async ({ file }) => {
  const fileName = `${Date.now()}-${file.name}`
  const { data, error } = await supabase.storage
    .from('uploads')
    .upload(fileName, file)
  if (error) throw error
  const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(data.path)
  return { file_url: urlData.publicUrl, url: urlData.publicUrl, path: data.path }
}

export const GenerateImage = async (payload) => {
  const { data, error } = await supabase.functions.invoke('generate-image', {
    body: payload,
  })
  if (error) throw error
  return data
}

export const ExtractDataFromUploadedFile = async (payload) => {
  const { data, error } = await supabase.functions.invoke('extract-data', {
    body: payload,
  })
  if (error) throw error
  return data
}

export const Core = {
  InvokeLLM,
  SendEmail,
  SendSMS,
  UploadFile,
  GenerateImage,
  ExtractDataFromUploadedFile,
}
