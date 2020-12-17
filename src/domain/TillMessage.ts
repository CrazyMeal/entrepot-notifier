export class TillMessage {
  phone: Array<string>; 
  text: string;

  constructor(text: string, phone: Array<string>) {
    this.text = text;
    this.phone = phone;
  }
}
