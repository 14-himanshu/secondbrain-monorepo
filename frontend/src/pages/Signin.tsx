import axios from "axios";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { BACKEND_URL } from "../config";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";

export function Signin() {
    const usernameRef = useRef<HTMLInputElement | null>(null);
    const passwordRef = useRef<HTMLInputElement | null>(null);
    const navigate = useNavigate()

    async function signin() {
      const username = usernameRef.current?.value ?? "";
      const password = passwordRef.current?.value ?? "";
      const response = await axios.post(BACKEND_URL + "/api/v1/signin", {
        username,
        password,
      });
      const jwt = response.data.token
      localStorage.setItem("token", jwt)
      navigate("/dashboard")
    }
    
  return (
    <div className="h-screen w-screen bg-gray-200 flex justify-center items-center">
      <div className="bg-white rounded-xl border-gray-500 min-w-48 p-8">
        <Input ref = {usernameRef} placeholder="Username" />
        <Input  ref = {passwordRef} placeholder="Password" />
        <div className="flex justify-center pt-4">
          <Button onClick={signin} loading ={false}  text="Signin" variant="primary" fullwidth= {true} />
        </div>
      </div>
    </div>
  );
}
