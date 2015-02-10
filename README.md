# Redraw
<img src="https://raw.githubusercontent.com/Thom-x/Redraw/master/images/ico.png" alt="alt text" width="30%" height="30%">

Demo Heroku : http://redrawhtml5.herokuapp.com

## Node :
    $ node server.js
Puis ouvrir un navigateur sur l'adresse http://127.0.0.1.

## Node Webkit : 
###Déploiment : 
    $ grunt
    
###Utilisation :
Ouvrir le binaire correspondant à votre OS.
Il est également possible d'ouvrir un onglet sur l'adresse http://127.0.0.1 de votre navigateur une fois une instance de node webkit ouverte (le serveur est lancé par node webkit).

## Heroku : 
###Déploiment : 
    $ heroku login
    $ heroku git:clone -a redrawhtml5
    $ cd redrawhtml5
    $ git add .
    $ git commit -am "make it better"
    $ git push heroku master
    
###Test :

	$ npm install -g foreman
	$ nf start
	
###Utilisation :
Se rendre sur l'adresse de votre application (ici http://redrawhtml5.herokuapp.com).



