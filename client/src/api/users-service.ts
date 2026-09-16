import axios from "axios";

export const registerUser = async (userData: never) => {
  try {
    const response = await axios.post("/api/users/register", userData);
    return response.data;
  } catch (error: any) {
    throw error.response.data;
  }
};

export const loginUser = async (userData: never) => {
  try {
    const response = await axios.post("/api/users/login", userData);
    return response.data;
  } catch (error: any) {
    throw error.response.data;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await axios.get("/api/users/current-user");
    return response.data;
  } catch (error: any) {
    throw error.response.data;
  }
};
