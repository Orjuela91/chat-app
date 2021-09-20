import { Component, OnInit } from '@angular/core';
import { Client } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { Mensaje } from './models/mensaje';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {

  private client!: Client;

  public conectado: boolean = false;

  public mensaje: Mensaje = new Mensaje();

  public mensajes: Mensaje[] = [];

  public escribiendo!: string;

  private clienteId: string;

  constructor() {
    this.clienteId = 'id-' + new Date().getUTCMilliseconds() + '-' + Math.random().toString(36).substr(2);
   }

  ngOnInit(): void {
    this.client = new Client();

    this.client.webSocketFactory = () => {
      return new SockJS("http://localhost:8080/chat-websocket");
    };

    this.client.onConnect = (frame) => {
      console.log('Conectados: ' + this.client.connected + ' : ' + frame);
      this.conectado = true;

      this.client?.subscribe('/chat/mensaje', (event) => {
        let mensaje: Mensaje = JSON.parse(event.body) as Mensaje;
        mensaje.fecha = new Date(mensaje.fecha);

        if(!this.mensaje.color && mensaje.tipo == 'NUEVO_USUARIO'
            && this.mensaje.username == mensaje.username){
              this.mensaje.color = mensaje.color;
        }

        this.mensajes.push(mensaje);
        console.log(mensaje);
      });

      this.client.subscribe('/chat/historial/' + this.clienteId, (event) => {
        const historial: Mensaje[] = JSON.parse(event.body) as Mensaje[];
        this.mensajes = historial.map( (message) => {
          message.fecha = new Date(message.fecha);
          return message;
        }).reverse();
      },);

      this.client.subscribe('/chat/escribiendo', (event) => {
        this.escribiendo = event.body;

        setTimeout(() => {
          this.escribiendo = '';
        }, 3000);// 3000 milisegundos = 3 segundos

      });
      
      this.client.publish({destination: '/app/historial', body: this.clienteId});

      this.mensaje.tipo = 'NUEVO_USUARIO';
      this.client.publish({
        destination: '/app/mensaje',
        body: JSON.stringify(this.mensaje)
      });

    };

    this.client.onDisconnect = (frame) => {
      console.log('Conectados: ' + this.client.connected + ' : ' + frame);
      this.conectado = false;
      this.mensaje = new Mensaje();

      this.mensajes = [];
    };
  }

  public conectar(): void {
    this.client.activate();
  }

  public desconectar(): void {
    this.client.deactivate();
  }

  public enviarMensaje(): void {
    this.mensaje.tipo = 'MENSAJE';
    this.client.publish({
      destination: '/app/mensaje',
      body: JSON.stringify(this.mensaje)
    });

    this.mensaje.texto = '';
  }

  public escribiendoEvento(): void {
    this.client.publish({
      destination: '/app/escribiendo',
      body: this.mensaje.username,
    });
  }
}
