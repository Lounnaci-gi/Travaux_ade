# Notes de Développement - AquaConnect

## ⚠️ Erreurs CSP dans la Console

Si vous voyez des erreurs comme :
```
Refused to connect to 'http://localhost:5000/.well-known/appspecific/com.chrome.devtools.json' 
because it violates the following Content Security Policy directive
```

**Ce sont des avertissements normaux en développement** qui ne affectent **PAS** le fonctionnement de l'application.

### Pourquoi ces erreurs apparaissent ?

Ces erreurs sont causées par :
- Chrome DevTools qui essaie automatiquement d'accéder à des endpoints de développement
- Des extensions de navigateur qui tentent d'accéder à des ressources
- Les outils de développement React qui peuvent générer des requêtes automatiques

### Solutions

1. **Ignorer ces erreurs** - Elles n'affectent pas l'application
2. **Fermer la console** - Les erreurs n'apparaissent que dans la console de développement
3. **Mode Production** - Ces erreurs n'apparaissent pas en production après `npm run build`

### En Production

Ces erreurs n'apparaîtront pas en production car :
- Le build de production ne génère pas ces requêtes
- Les outils de développement ne sont pas inclus dans le build final

## 🚀 Fonctionnalités

L'application fonctionne normalement malgré ces avertissements. Vous pouvez :
- ✅ Accéder au Dashboard
- ✅ Voir la liste des travaux
- ✅ Consulter les détails d'un travail
- ✅ Utiliser toutes les fonctionnalités sans problème

## 📝 Autres Notes

- Les erreurs dans la console sont différentes des erreurs qui affectent l'application
- Si l'application ne fonctionne pas, vérifiez les erreurs dans l'onglet "Network" ou "Console" avec le filtre "Error"
- Ces avertissements CSP sont uniquement visibles en développement

