const API_URL = "http://127.0.0.1:8000";

async function handle(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }
  return res.json();
}

export const ThoughtWeaverAPI = {
  listThoughts: async () => {
    const res = await fetch(`${API_URL}/thoughts`);
    return handle(res);
  },

  createThought: async (data) => {
    const res = await fetch(`${API_URL}/thoughts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handle(res);
  },

  updateThought: async (id, data) => {
    const res = await fetch(`${API_URL}/thoughts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handle(res);
  },

  analyzeThought: async (content) => {
    const res = await fetch(`${API_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    return handle(res);
  },
};
