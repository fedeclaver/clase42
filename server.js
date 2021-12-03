const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const Conexion = require('./config/config.js');
const productosRouter = require("./routes/productos.js");
const carritosRouter = require("./routes/carritos.js");
const authRouter = require("./routes/auth.js");
const app = express();
PORT = process.env.PORT | 8080;
const Cache = require('node-cache');
const cache = new Cache()
const { fork } = require('child_process')
//const requireAuth = require("../middleware/acceso.js");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/productos", productosRouter);
app.use("/carritos", carritosRouter);
//app.use("/auth", authRouter);



app.use(session({
  secret: 'secreto',
  resave: true,
  saveUninitialized: true
}));

app.use(session({
   store: MongoStore.create({ mongoUrl: Conexion.mongodb.cnxStr }),
   secret: 'secreto',
   resave: false,
   saveUninitialized: false,
   cookie: {
    maxAge: 60000
}
}));

app.get('/random', (req, res) => {
  const numeroRandom = fork('./random.js')
  let cantidad = 0
  if (req.query.cant) {
      cantidad = req.query.cant
  } else {
      cantidad = 100000000
  }
  numeroRandom.send((cantidad).toString());
  numeroRandom.on("message", obj => {
      res.end(JSON.stringify(obj, null, 3));
  });
})


// info
app.get('/info', (req, res) => {
  let informacion = {}
  informacion['Argumentos de entrada:'] = `${process.argv[2]} ${process.argv[3]} ${process.argv[4]}`;
  informacion['Nombre de plataforma:'] = process.platform;
  informacion['Version de Node:'] = process.version;
  informacion['Uso de memoria:'] = process.memoryUsage();
  informacion['Path de ejecucion:'] = process.execPath;
  informacion['Process id:'] = process.pid;
  informacion['Carpeta corriente:'] = process.cwd();
  res.send(informacion)
})





app.get('/', (req, res) => {
  res.redirect('/index.html');
})


app.get('/logout', (req, res) => {
  const nombre = req.session.nombre
  if (nombre){
  req.session.destroy(err=>{
    if (!err) {
          
            res.json({ msg: `Hasta luego ${nombre}!`});
          
          } else {
            res.status(500);
            res.json({error: err});
          }
      }
  );
}else {
  res.json({ msg: `no hay session `});
}
});

app.post('/login', (req, res) => {
  const nombre = req.session?.nombre
  if (nombre) {
    res.json({ msg: `Te damos la bienvenida!`});
} else {
    req.session.nombre = req.body.username;
    res.json({ msg: `Bienvenido ${req.session.nombre}!`});
}
      
})
// pongo a escuchar el servidor en el puerto indicado
// definir puerto por linea de comandos
let port = 0
if (process.argv[2] && !isNaN(process.argv[2])) {
    puerto = process.argv[2]
} else if (isNaN(process.argv[2])) {
    console.log('No se ingresó un puerto válido, se usará el 8080')
    puerto = 8080
}

const server = app.listen(puerto, () => {
  console.log(process.argv)
  console.log(`Servidor http escuchando en el puerto ${server.address().port}`);
});
server.on("error", (error) => console.log(`Error en servidor ${error}`));
 