const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const usuariosDao = require("../daos/usuarios/index.js");
const config = require('../config/config');
const transporterGmail = require('../email/gmail');
const { loggerTrace,loggerInfo, loggerWarn, loggerError } = require('../utils/log4js');

// LocalStrategy de "login"
passport.use('login', new LocalStrategy({
    passReqToCallback: true
},
    async (req, username, password, done) => {
        // chequeamos si el usuario existe en mongo
        const user = await usuariosDao.getById({ 'usuario': username });

        // si no existe
        if (!user.usuario) {
            return done(null, false, loggerWarn.warn('Usuario no existe!'));
        }

        // usuario existe pero esta mal la contraseña
        if (!isValidPassword(user.password, password)) {
            return done(null, false, loggerWarn.warn('Password incorrecto!'));
        }

        // Si todo OK
        return done(null,user);

    }
))

// validar password
const isValidPassword = (userPassword, password) => {
    return bcrypt.compareSync(password, userPassword)
  }


passport.use('signup', new LocalStrategy({
    passReqToCallback: true
},
    (req, username, password, done) => {

        findOrCreateUser = async () => {
            // buscar en mongo el usuario
            const user = await usuariosDao.getById({ 'usuario': username });

            // usuario ya existe
            if (user) {
                return done(null, false, loggerWarn.warn('Usuario ya existe'));
            }

            if (!req.file) {
                return done(null, false, loggerWarn.warn('Faltó subir una foto de perfil'));
            }

            // creamos el usuario
            const newUser = {
                usuario: username,
                password: createHash(password),
                nombre: req.body.nombre,
                direccion: req.body.direccion,
                edad: req.body.edad,
                telefono: req.body.telefono,
                foto: req.file.filename
            }

            usuariosDao.save(newUser);

            //aviso log con Gmail
            transporterGmail.sendMail({
                from: config.GMAIL_USER,
                to: config.ADMIN_EMAIL,
                subject: 'Nuevo Registro de Usuario',
                html: `
                        <p>Email: ${newUser.username}</p>
                        <p>Nombre: ${newUser.nombre}</p>
                        <p>Dirección: ${newUser.direccion}</p>
                        <p>Edad: ${newUser.edad}</p>
                        <p>Teléfono: ${newUser.telefono}</p>
                    `
            }, (err, info) => {
                if (err) {
                    loggerError.error(err)
                    return err
                }
                loggerInfo.info(info);
            });

            return done(null, newUser);

        }

        process.nextTick(findOrCreateUser);

    }
));

// hashear pass
const createHash = (password) => {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10), null);
};


// serializar
passport.serializeUser((user, done) => {
    done(null, user);
});
// deserializar
passport.deserializeUser((user, done) => {
    done(null, user)
});

module.exports = passport;