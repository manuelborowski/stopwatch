
export const api_post = async (endpoint, body) => {
    const response = await fetch(Flask.url_for(`api.${endpoint}`), {headers: {'x-api-key': api_key,}, method: 'POST', body: JSON.stringify(body),});
    const data = await response.json();
    return data
}

export const api_get = async (endpoint, args) => {
    const respone = await fetch(Flask.url_for(`api.${endpoint}`, args), {headers: {'x-api-key': api_key,}});
    const data = await respone.json();
    return data
}