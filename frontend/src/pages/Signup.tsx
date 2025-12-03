import { useRef } from "react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { BACKEND_URL } from "../config";
import axios from "axios";
import { useNavigate } from "react-router-dom";


export function Signup() {
const usernameRef = useRef<HTMLInputElement | null>(null);
const passwordRef = useRef<HTMLInputElement | null>(null);
const navigate = useNavigate()


    async function signup(){
        const username = usernameRef.current?.value ?? "";
        const password = passwordRef.current?.value ?? "";
        await axios.post(BACKEND_URL + "/api/v1/signup", {
           username, password ,
        });
        alert("Signup successful");
        navigate("/signin")

    }
  return (
    <div className="h-screen w-screen bg-gray-200 flex justify-center items-center">
      <div className="bg-white rounded-xl border-gray-500 min-w-48 p-8">
        <Input ref={usernameRef} placeholder="Username" />
        <Input ref={passwordRef} placeholder="Password" />
        <div className="flex justify-center pt-4">
          <Button onClick={signup} loading ={false}  text="Signup" variant="primary" fullwidth= {true} />
        </div>
      </div>
    </div>
  );
}
