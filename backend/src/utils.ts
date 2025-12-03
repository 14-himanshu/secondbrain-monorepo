export function random(len:number){
    let option  = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result  = "";
    for (let i = 0; i < len; i++) {
        result += option.charAt(Math.floor(Math.random() * option.length));
    }
    return result;
}