Hooks.on('renderActorSheet', function(obj, html){
  if(!game.modules.get('herovaultfoundry')?.active) {

    // Only inject the link if the actor is of type "character" and the user has permission to update it
    const actor = obj.actor;
    // if (!(actor.data.type === "character" && actor.can(game.user, "update"))) return;

    let element = html.find(".window-header .window-title");
    if (element.length != 1) return;

    let button = $(`<a class="popout" style><i class="fas fa-book"></i>Import from Pathbuilder 2e</a>`);
    button.on('click', () => beginPathbuilderImport(obj.object));
    element.after(button);
   }
});

var applyChanges = false;
var finishedFeats = false;
var finishedActions = false;
var finishedClassFeatures = false;
var finishedAncestryFeatures=false;
var finishedEquipment=false;
var finishedSpells = false;

var addFeats=false;
var addEquipment=false;
var addMoney=false;
var addSpellcasters=false;
var deleteAll=false;

var allItems=[];
var jsonBuild=[];
var addedItems=[];


          // <input type="checkbox" id="checkBoxSpellcasters" name="checkBoxSpellcasters" checked>
          // <label for="checkBoxSpellcasters"> Import Spellcasters? (Deletes existing)</label><br><br>


function beginPathbuilderImport(targetActor){

  applyChanges = false;
  finishedFeats = false;
  finishedActions = false;
  finishedClassFeatures = false;
  finishedAncestryFeatures=false;
  finishedEquipment=false;
  finishedSpells = false;
  allItems=[];
  
  new Dialog({
    title: `Pathbuilder Import`,
    content: `
      
      <div>
        <p>Step 1: Refresh this browser page!</p>
        <p>Step 2: Export your character from Pathbuilder 2e via the app menu</p>
        <p>Step 3: Enter the 6 digit user ID number from the pathbuilder export dialog below</p>
        <br>
        <p>Please note - items which cannot be matched to the Foundry database will not be imported!<p>
      <div>
      <hr/>
      <form>
          <input type="checkbox" id="checkBoxFeats" name="checkBoxFeats" checked>
          <label for="checkBoxFeats"> Import Feats and Specials?</label><br><br>
          <input type="checkbox" id="checkBoxEquipment" name="checkBoxEquipment">
          <label for="checkBoxEquipment"> Import Equipment?</label><br>
          <input type="checkbox" id="checkBoxMoney" name="checkBoxMoney">
          <label for="checkBoxMoney"> Import Money?</label><br><br>
          <input type="checkbox" id="checkBoxDeleteAll" name="checkBoxDeleteAll">
          <label for="checkBoxDeleteAll"> Delete all existing items before import?</label><br><br>
         
      </form>
      <p>Import of spells is temporarily disabled!</p>
      <div id="divCode">
        Enter your pathbuilder user ID number<br>
        <div id="divOuter">
          <div id="divInner">
            <input id="textBoxBuildID" type="number" maxlength="6" />
          </div>
        </div>
      </div>
      <br><br>
      <style>
      
        #textBoxBuildID {
            border: 0px;
            padding-left: 15px;
            letter-spacing: 42px;
            background-image: linear-gradient(to left, black 70%, rgba(255, 255, 255, 0) 0%);
            background-position: bottom;
            background-size: 50px 1px;
            background-repeat: repeat-x;
            background-position-x: 35px;
            width: 330px;
            min-width: 330px;
          }
          
          #divInner{
            left: 0;
            position: sticky;
          }
          
          #divOuter{
            width: 285px; 
            overflow: hidden;
          }
  
          #divCode{  
            border: 1px solid black;
            width: 300px;
            margin: 0 auto;
            padding: 5px;
          }
          #checkBoxMoney{  
            margin-left: 35px;
          }
  
      </style>
      `,
    buttons: {
      yes: {
        icon: "<i class='fas fa-check'></i>",
        label: `Import`,
        callback: () => applyChanges = true
      },
      no: {
        icon: "<i class='fas fa-times'></i>",
        label: `Cancel`
      },
    },
    default: "yes",
    close: html => {
      if (applyChanges) {
         
         let buildID= html.find('[id="textBoxBuildID"]')[0].value;
         if (!isNormalInteger(buildID)){
             ui.notifications.warn("Build ID must be a positive integer!");
             return;
         }
         addFeats = html.find('[name="checkBoxFeats"]')[0].checked;
  
         addEquipment = html.find('[name="checkBoxEquipment"]')[0].checked;
  
         addMoney = html.find('[name="checkBoxMoney"]')[0].checked;
  
        //  addSpellcasters = html.find('[name="checkBoxSpellcasters"]')[0].checked;
  
         deleteAll = html.find('[name="checkBoxDeleteAll"]')[0].checked;
  
         fetchPathbuilderBuild(targetActor, buildID);
  
      }
    }
  }).render(true);

}



function isNormalInteger(str) {
    var n = Math.floor(Number(str));
    return n !== Infinity && String(n) === str && n >= 0;
}

function fetchPathbuilderBuild(targetActor, buildID){

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        let responseJSON = JSON.parse(this.responseText);
        console.log(responseJSON);

        if (responseJSON.success){
          jsonBuild = responseJSON.build;
          checkCharacterIsCorrect(targetActor, responseJSON.build);
        } else {
          ui.notifications.warn("Unable to find a character with this build id!");
          return;
        }
        
      }
    };
    xmlhttp.open("GET", "https://www.pathbuilder2e.com/json.php?id="+buildID, true);
    xmlhttp.send();

}

function checkCharacterIsCorrect(targetActor,jsonBuild){

  let correctCharacter = false;
  new Dialog({
    title: jsonBuild.name,
    content: `
      <div>Importing `+jsonBuild.name+`, level `+jsonBuild.level+`<div><br><br>
      `,
    buttons: {
      yes: {
        icon: "<i class='fas fa-check'></i>",
        label: `Proceed`,
        callback: () => correctCharacter = true
      },
      no: {
        icon: "<i class='fas fa-times'></i>",
        label: `Cancel`
      },
    },
    default: "yes",
    close: html => {
      if (correctCharacter) {
        importCharacter(targetActor, jsonBuild);
      }
    }
  }).render(true);

  
}



function shouldBeManuallyDeleted(i){
  // if (i.data.type=="ancestry"){
  //   return false;
  // }  
  if (i.data.type=="feat"){
    if (i.data.data.featType.value=="ancestryfeature"){
      return false;
    }
  }
  // if (i.data.type=="spell"){
  //   return false;
  // }
  return true;
}


async function importCharacter(targetActor, jsonBuild){

  
  if (deleteAll){

    const items = targetActor.data.items.filter(i => shouldBeManuallyDeleted(i));
    const deletions = items.map(i => i.id);
    const updated = await targetActor.deleteEmbeddedDocuments("Item", deletions);

    // let deletions = targetActor.data.items.map(i => i.id);
    // let updated = await targetActor.deleteEmbeddedDocuments("Item", deletions);


  } else if (addMoney){
    let items = targetActor.data.items.filter(i => i.name === "Platinum Pieces" || i.name === "Gold Pieces" || i.name === "Silver Pieces" || i.name === "Copper Pieces");
    let deletions = items.map(i => i.id);
    let updated = await targetActor.deleteEmbeddedDocuments("Item", deletions); 

  }


  let arrayFeats = jsonBuild.feats;
  let arrayEquipment = jsonBuild.equipment;
  let arrayWeapons = jsonBuild.weapons;
  let arrayArmor = jsonBuild.armor;
  let arraySpecials = jsonBuild.specials;
  let arrayLores = jsonBuild.lores;

    // lower case languages fix
for (var ref in jsonBuild.languages) {
    if (jsonBuild.languages.hasOwnProperty(ref)) {
      jsonBuild.languages[ref]=jsonBuild.languages[ref].toLowerCase();
    }
}
// senses
var senses = [];
for (var ref in arraySpecials){
    if (arraySpecials.hasOwnProperty(ref)){
        if (arraySpecials[ref]=="Low-Light Vision"){
            senses[0]={
              exceptions: '',
              label: 'Low-Light Vision',
              type: "lowLightVision",
              value: ''
          }
        } else if (arraySpecials[ref]=="Darkvision"){
          senses[1]={
            exceptions: '',
            label: 'Darkvision',
            type: "darkvision",
            value: ''
        }
      }
    }
}



    // 'data.details.class.value': jsonBuild.class,
    // 'data.details.ancestry.value': jsonBuild.ancestry,

  targetActor.update({
    'name': jsonBuild.name, 
    'data.details.level.value': jsonBuild.level, 
    'data.details.background.value': jsonBuild.background, 
    'data.details.heritage.value': jsonBuild.heritage,
    'data.details.age.value': jsonBuild.age,
    'data.details.gender.value': jsonBuild.gender,
    'data.details.keyability.value': jsonBuild.keyability,

    'data.traits.size.value': getSizeValue(jsonBuild.size),

    'data.traits.languages.value': jsonBuild.languages,
    'data.traits.senses': senses,


    'data.abilities.str.value': jsonBuild.abilities.str,
    'data.abilities.dex.value': jsonBuild.abilities.dex,
    'data.abilities.con.value': jsonBuild.abilities.con,
    'data.abilities.int.value': jsonBuild.abilities.int,
    'data.abilities.wis.value': jsonBuild.abilities.wis,
    'data.abilities.cha.value': jsonBuild.abilities.cha,

    'data.attributes.ancestryhp': jsonBuild.attributes.ancestryhp,
    'data.attributes.classhp': jsonBuild.attributes.classhp,
    'data.attributes.speed.value': jsonBuild.attributes.speed,
    'data.attributes.flatbonushp': jsonBuild.attributes.bonushp,

    'data.saves.fortitude.rank': jsonBuild.proficiencies.fortitude/2,
    'data.saves.reflex.rank': jsonBuild.proficiencies.reflex/2,
    'data.saves.will.rank': jsonBuild.proficiencies.will/2,

    'data.martial.advanced.rank': jsonBuild.proficiencies.advanced/2,
    'data.martial.heavy.rank': jsonBuild.proficiencies.heavy/2,
    'data.martial.light.rank': jsonBuild.proficiencies.light/2,
    'data.martial.medium.rank': jsonBuild.proficiencies.medium/2,
    'data.martial.unarmored.rank': jsonBuild.proficiencies.unarmored/2,
    'data.martial.martial.rank': jsonBuild.proficiencies.martial/2,
    'data.martial.simple.rank': jsonBuild.proficiencies.simple/2,
    'data.martial.unarmed.rank': jsonBuild.proficiencies.unarmed/2,

    
    'data.skills.acr.rank' : jsonBuild.proficiencies.acrobatics/2,
    'data.skills.arc.rank' : jsonBuild.proficiencies.arcana/2,
    'data.skills.ath.rank' : jsonBuild.proficiencies.athletics/2,
    'data.skills.cra.rank' : jsonBuild.proficiencies.crafting/2,
    'data.skills.dec.rank' : jsonBuild.proficiencies.deception/2,
    'data.skills.dip.rank' : jsonBuild.proficiencies.diplomacy/2,
    'data.skills.itm.rank' : jsonBuild.proficiencies.intimidation/2,
    'data.skills.med.rank' : jsonBuild.proficiencies.medicine/2,
    'data.skills.nat.rank' : jsonBuild.proficiencies.nature/2,
    'data.skills.occ.rank' : jsonBuild.proficiencies.occultism/2,
    'data.skills.prf.rank' : jsonBuild.proficiencies.performance/2,
    'data.skills.rel.rank' : jsonBuild.proficiencies.religion/2,
    'data.skills.soc.rank' : jsonBuild.proficiencies.society/2,
    'data.skills.ste.rank' : jsonBuild.proficiencies.stealth/2,
    'data.skills.sur.rank' : jsonBuild.proficiencies.survival/2,
    'data.skills.thi.rank' : jsonBuild.proficiencies.thievery/2,

    'data.attributes.perception.rank': jsonBuild.proficiencies.perception/2,
    'data.attributes.classDC.rank': jsonBuild.proficiencies.classDC/2

  });





  

  // // //ancestry
  if (targetActor.data.data.details.ancestry!=jsonBuild.ancestry){
    if (!deleteAll){
      const items = targetActor.data.items.filter(i => i.type === "ancestry");
      const deletions = items.map(i => i.id);
      const updated = await targetActor.deleteEmbeddedDocuments("Item", deletions); // Deletes multiple EmbeddedEntity objects
    }
    let packAncestry = await game.packs.get('pf2e.ancestries').getDocuments();
    for (const item of packAncestry) {
        if (item.data.data.slug == getSlug(jsonBuild.ancestry)){
          allItems.push(item.data);
        }
    }
  }
  
  

  // //class
  if (targetActor.data.data.details.class!=jsonBuild.class){
    if (!deleteAll){
      const items = targetActor.data.items.filter(i => i.type === "class");
      const deletions = items.map(i => i.id);
      const updated = await targetActor.deleteEmbeddedDocuments("Item", deletions); // Deletes multiple EmbeddedEntity objects
    }
    let packClasses = await game.packs.get('pf2e.classes').getDocuments();
    for (const item of packClasses) {
        if (item.data.data.slug == getSlug(jsonBuild.class)){
          allItems.push(item.data);
        }
    }
  }
  




  if (addFeats){

    finishedAncestryFeatures=true;
    finishedClassFeatures=true;

    addFeatItems(targetActor, arrayFeats);

    addActionItems(targetActor, arraySpecials);

    // addAncestryFeatureItems(targetActor, arraySpecials);
    
    // addClassFeatureItems(targetActor, arraySpecials);
    


  }else {
    finishedFeats=true;
    finishedAncestryFeatures=true;
    finishedActions=true;
    finishedClassFeatures=true;
    checkAllFinishedAndCreate(targetActor);
  }


  if (addEquipment){

    let pack = game.packs.get('pf2e.equipment-srd');
    let content = await game.packs.get('pf2e.equipment-srd').getDocuments();
    let backpackData = await pack.getDocuments('3lgwjrFEsQVKzhh7');
    let backpackInstance = [];

    let arrayKit=[];
    if (hasAdventurersPack(arrayEquipment)){
      // adventurers kit hack since pathbuilder allows unexploded kits and foundry doesn't
        backpackInstance = await targetActor.createEmbeddedDocuments("Item", backpackData);
        arrayKit.push(["bedroll", 1]);
        arrayKit.push(["chalk", 10]);
        arrayKit.push(["flint-and-steel", 1]);
        arrayKit.push(["rope", 1]);
        arrayKit.push(["rations", 14]);
        arrayKit.push(["torch", 5]);
        arrayKit.push(["waterskin", 1]);


    }

    // specific proficiencies
    let specificTrained = jsonBuild.specificProficiencies.trained;
    let specificExpert = jsonBuild.specificProficiencies.expert;
    let specificMaster = jsonBuild.specificProficiencies.master;
    let specificLegendary = jsonBuild.specificProficiencies.legendary;

    let specificTrainedInstance =[];
    let specificExpertInstance =[];
    let specificMasterInstance =[];
    let specificLegendaryInstance =[];
    if (specificTrained.length>0 && needsNewInstanceofItem(targetActor, 'Specific Trained' )){
      specificTrainedInstance = await targetActor.createEmbeddedDocuments('Item', {
        name: 'Specific Trained',
        type: 'martial',
        data: { proficient: { value: 1 }}
      });
    }
    if (specificExpert.length>0 && needsNewInstanceofItem(targetActor, 'Specific Expert' )){
      specificExpertInstance = await targetActor.createEmbeddedDocuments('Item', {
        name: 'Specific Expert',
        type: 'martial',
        data: { proficient: { value: 2 }}
      });
    }
    if (specificMaster.length>0 && needsNewInstanceofItem(targetActor, 'Specific Master' )){
      specificMasterInstance = await targetActor.createEmbeddedDocuments('Item', {
        name: 'Specific Master',
        type: 'martial',
        data: { proficient: { value: 3 }}
      });
    }
    if (specificLegendary.length>0 && needsNewInstanceofItem(targetActor, 'Specific Legendary' )){
      specificLegendaryInstance = await targetActor.createEmbeddedDocuments('Item', {
        name: 'Specific Legendary',
        type: 'martial',
        data: { proficient: { value: 4 }}
      });
    }


    for (const action of content.filter(item => equipmentIsRequired(item, arrayEquipment, arrayWeapons, arrayArmor, arrayKit, addMoney))) {
      for (var ref in arrayEquipment) {
          if (arrayEquipment.hasOwnProperty(ref)) {
            var itemName= arrayEquipment[ref][0];
           
            if (isNameMatch(itemName, action.data.data.slug) && needsNewInstanceofItem(targetActor, itemName)){
              var itemAmount= arrayEquipment[ref][1];
              arrayEquipment[ref].added=true;
              const clonedData = JSON.parse(JSON.stringify(action.data));
              if (clonedData.type!="kit"){
                clonedData.data.quantity.value = itemAmount;
                allItems.push(clonedData);
              }           
            }
        }
      }


      

      for (var ref in arrayKit) {
        if (arrayKit.hasOwnProperty(ref)) {
          var itemSlug= arrayKit[ref][0];
          if (itemSlug=== action.data.data.slug && needsNewInstanceofItem(targetActor, itemName)){
            var itemAmount= arrayKit[ref][1];
            const clonedData = JSON.parse(JSON.stringify(action.data));
            clonedData.data.quantity.value = itemAmount;
            clonedData.data.containerId.value = backpackInstance.id;
            allItems.push(clonedData);          
          }
      }
    }

      for (var ref in arrayWeapons) {
        if (arrayWeapons.hasOwnProperty(ref)) {

          var weaponDetails = arrayWeapons[ref];
          if (isNameMatch(weaponDetails.name, action.data.data.slug) && needsNewInstanceofItem(targetActor, weaponDetails.name)){
            weaponDetails.added=true;
            const clonedData = JSON.parse(JSON.stringify(action.data));

            clonedData.data.quantity.value = weaponDetails.qty;
            if (specificTrained.includes(weaponDetails.name)){
              clonedData.data.weaponType.value = specificTrainedInstance.id;
            } else if (specificExpert.includes(weaponDetails.name)){
              clonedData.data.weaponType.value = specificExpertInstance.id;
            } else if (specificMaster.includes(weaponDetails.name)){
              clonedData.data.weaponType.value = specificMasterInstance.id;
            } else if (specificLegendary.includes(weaponDetails.name)){
              clonedData.data.weaponType.value = specificLegendaryInstance.id;
            } else {
              clonedData.data.weaponType.value = weaponDetails.prof;
            }
            
            clonedData.data.damage.die = weaponDetails.die;
            clonedData.data.potencyRune.value = weaponDetails.pot.toString();
            clonedData.data.strikingRune.value = weaponDetails.str;

            if (weaponDetails.runes[0]){
              clonedData.data.propertyRune1.value=camelCase(weaponDetails.runes[0]);
            }
            if (weaponDetails.runes[1]){
              clonedData.data.propertyRune2.value==camelCase(weaponDetails.runes[1]);
            }
            if (weaponDetails.runes[2]){
              clonedData.data.propertyRune3.value==camelCase(weaponDetails.runes[2]);
            }
            if (weaponDetails.runes[3]){
              clonedData.data.propertyRune4.value=camelCase(weaponDetails.runes[3]);
            }

            if (weaponDetails.mat){
              let material = weaponDetails.mat.split(" (")[0];
              clonedData.data.preciousMaterial.value = camelCase(material);
              clonedData.data.preciousMaterialGrade.value = getMaterialGrade(weaponDetails.mat);
            }
            if (weaponDetails.display){
              clonedData.name = weaponDetails.display;
            }
            allItems.push(clonedData);


          }
        }
      }

      for (var ref in arrayArmor) {
        if (arrayArmor.hasOwnProperty(ref)) {

          var armorDetails = arrayArmor[ref];
          
          if (isNameMatch(armorDetails.name, action.data.data.slug) && needsNewInstanceofItem(targetActor, armorDetails.name)){
            armorDetails.added=true;
            const clonedData = JSON.parse(JSON.stringify(action.data));

            if (notBracersOfArmor(armorDetails.name)){
              clonedData.data.quantity.value = armorDetails.qty;
              clonedData.data.armorType.value = armorDetails.prof;
              clonedData.data.potencyRune.value = armorDetails.pot.toString();
              clonedData.data.resiliencyRune.value = armorDetails.res;
              // this will also catch the nulls from early json data which did not have this value
              if (armorDetails.worn){
                clonedData.data.equipped.value = true;
              } else {
                clonedData.data.equipped.value = false;
              }
  
              if (armorDetails.runes[0]){
                clonedData.data.propertyRune1.value=camelCase(armorDetails.runes[0]);
              }
              if (armorDetails.runes[1]){
                clonedData.data.propertyRune2.value=camelCase(armorDetails.runes[1]);
              }
              if (armorDetails.runes[2]){
                clonedData.data.propertyRune3.value=camelCase(armorDetails.runes[2]);
              }
              if (armorDetails.runes[3]){
                clonedData.data.propertyRune4.value=camelCase(armorDetails.runes[3]);
              }
  
              if (armorDetails.mat){
                let material = armorDetails.mat.split(" (")[0];
                clonedData.data.preciousMaterial.value = camelCase(material);
                clonedData.data.preciousMaterialGrade.value = getMaterialGrade(armorDetails.mat);
              }
  
              if (armorDetails.display){
                clonedData.name = armorDetails.display;
              }
            }
            

            allItems.push(clonedData);

          }
        }
      }

      if (addMoney){
        if (action.data.data.slug==='platinum-pieces'){
          const clonedData = JSON.parse(JSON.stringify(action.data));
            clonedData.data.quantity.value = jsonBuild.money.pp;
            allItems.push(clonedData);
        } else if (action.data.data.slug==='gold-pieces'){
          const clonedData = JSON.parse(JSON.stringify(action.data));
          clonedData.data.quantity.value = jsonBuild.money.gp;
          allItems.push(clonedData);
        }  else if (action.data.data.slug==='silver-pieces'){
          const clonedData = JSON.parse(JSON.stringify(action.data));
          clonedData.data.quantity.value = jsonBuild.money.sp;
          allItems.push(clonedData);
        }  else if (action.data.data.slug==='copper-pieces'){
          const clonedData = JSON.parse(JSON.stringify(action.data));
          clonedData.data.quantity.value = jsonBuild.money.cp;
          allItems.push(clonedData);
        } 
      }
    }
    finishedEquipment=true;
    checkAllFinishedAndCreate(targetActor);
  } else {
    finishedEquipment=true;
    checkAllFinishedAndCreate(targetActor);
  }

  if (addSpellcasters){
    setSpellcasters(targetActor, jsonBuild.spellCasters, deleteAll);
  } else {
    finishedSpells=true;
    checkAllFinishedAndCreate(targetActor);
  }

  addLores(targetActor, arrayLores);
 

}

// function getExistingClassSlug(targetActor){

//   for (const item of targetActor.data.items) {
//     console.log(item.data.type);
//     if (item.data.type =="class"){
//       return item.data.slug;
//     }
//   }

//   // for (var ref in targetActor.data.items) {
//   //   if (targetActor.data.items.hasOwnProperty(ref)) {
//   //     let item =targetActor.data.items[ref]; 
//   //     if (item.type =="class"){
//   //       return item.data.slug;
//   //     }
//   //   }         
//   // }
//   return null;
// }
function getExistingAncestrySlug(targetActor){
  for (var ref in targetActor.data.items) {
    if (targetActor.data.items.hasOwnProperty(ref)) {
      let item =targetActor.data.items[ref]; 
      if (item.type =="ancestry"){
        return item.data.slug;
      }
    }         
  }
  return null;
}

function notBracersOfArmor(name){
  return !name.toLowerCase().includes("bracers of armor");
}

function camelCase(str) { 
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) 
  { 
      return index == 0 ? word.toLowerCase() : word.toUpperCase(); 
  }).replace(/\s+/g, ''); 
} 

function getMaterialGrade(material){

  if (material.toLowerCase().includes("high-grade")){
    return "high";
  } else if (material.toLowerCase().includes("standard-grade")){
    return "standard";
  }
  return "low";
}

async function addFeatItems(targetActor, arrayFeats){
  var usedLocations =[];
  let content = await game.packs.get('pf2e.feats-srd').getDocuments();
  for (const action of content.filter(item => featIsRequired(item, arrayFeats))) {
    for (var ref in arrayFeats) {
        if (arrayFeats.hasOwnProperty(ref)) {

        
          let pathbuilderFeatItem = arrayFeats[ref];
          var itemName= pathbuilderFeatItem[0];
          var itemExtra= pathbuilderFeatItem[1];
            
          if (isNameMatch(itemName, action.data.data.slug) && needsNewInstanceofFeat(targetActor, itemName, itemExtra)){
            var displayName = itemName;
            addedItems.push(itemName);
            if (itemExtra!=null){
              displayName +=" ("+itemExtra+")";
            }
            const clonedData = JSON.parse(JSON.stringify(action.data));
            clonedData.name = displayName;

            try{
              if (pathbuilderFeatItem[2] && pathbuilderFeatItem[3]){
                let location = getFoundryFeatLocation(pathbuilderFeatItem[2], pathbuilderFeatItem[3]);
                if (!usedLocations.includes(location)){
                  clonedData.data.location = location;
                  usedLocations.push(location);
                }                
              }
            } catch(err){
              console.log(err);
            }
            

            allItems.push(clonedData);
          }
        }
        
    }
  }
  finishedFeats=true;
  checkAllFinishedAndCreate(targetActor);
}

function isNameMatch(pathbuilderItemName, foundryItemSlug){
  if (getSlug(pathbuilderItemName)==foundryItemSlug)return true;
  if (getSlug(getClassAdjustedSpecialNameLowerCase(pathbuilderItemName)) == foundryItemSlug) return true;
  return false;
}
async function addActionItems(targetActor, arraySpecials){

  let content = await game.packs.get('pf2e.actionspf2e').getDocuments();
  for (const action of content.filter(item => specialIsRequired(item, arraySpecials))) {
    for (var ref in arraySpecials) {
      if (arraySpecials.hasOwnProperty(ref)) {
        var itemName= arraySpecials[ref];
        if (isNameMatch(itemName, action.data.data.slug) && needsNewInstanceofItem(targetActor, itemName)){
          addedItems.push(itemName);
          allItems.push(action.data);
        }
      }
    }
  }
  finishedActions = true;
  checkAllFinishedAndCreate(targetActor);
}
async function addAncestryFeatureItems(targetActor, arraySpecials){

  let content = await game.packs.get('pf2e.ancestryfeatures').getDocuments();
  for (const action of content.filter(item => specialIsRequired(item, arraySpecials))) {
    for (var ref in arraySpecials) {
      if (arraySpecials.hasOwnProperty(ref)) {
        var itemName= arraySpecials[ref];
        if (isNameMatch(itemName, action.data.data.slug) && needsNewInstanceofItem(targetActor, itemName)){
          addedItems.push(itemName);
          allItems.push(action.data);
        }
      }
    }
  }
  finishedAncestryFeatures = true;
  checkAllFinishedAndCreate(targetActor);
}
async function addClassFeatureItems(targetActor, arraySpecials){

  let content = await game.packs.get('pf2e.classfeatures').getDocuments();
  for (const action of content.filter(item => specialIsRequired(item, arraySpecials))) {
    for (var ref in arraySpecials) {
      if (arraySpecials.hasOwnProperty(ref)) {
        var itemName= arraySpecials[ref];
        if (isNameMatch(itemName, action.data.data.slug) && needsNewInstanceofItem(targetActor, itemName)){
          addedItems.push(itemName);
          allItems.push(action.data);
        }
      }
    }
  }
  finishedClassFeatures = true;
  checkAllFinishedAndCreate(targetActor);
}



function hasAdventurersPack(arrayEquipment){
  for (var ref in arrayEquipment) {
    if (arrayEquipment.hasOwnProperty(ref)) {
      var itemName= arrayEquipment[ref][0];
      if (itemName==="Adventurer's Pack"){
        arrayEquipment[ref].added=true;
        return true;
      }
    }
  }
  return false;
}

function isSpecialsPack(packName){
  return packName==='actionspf2e' || packName==='ancestryfeatures' || packName==='classfeatures';
}

function featIsRequired(item, arrayFeats){
  for (var featDetails in arrayFeats) {
   if (arrayFeats.hasOwnProperty(featDetails)) {
        if (getSlug(arrayFeats[featDetails][0]) == item.data.data.slug){
          return true;
        }
        if (getSlug(getClassAdjustedSpecialNameLowerCase(arrayFeats[featDetails][0]))== item.data.data.slug) return true;
    }
  }
  return false;
}
function specialIsRequired(item, arraySpecials){
  for (var ref in arraySpecials) {
    if (arraySpecials.hasOwnProperty(ref)) {

      if (getSlug(arraySpecials[ref]) == item.data.data.slug) return true;
      if (getSlug(getClassAdjustedSpecialNameLowerCase(arraySpecials[ref]))== item.data.data.slug) return true;
    }

  }
  return false;
}
function equipmentIsRequired(item, arrayEquipment, arrayWeapons, arrayArmor, arrayKit, addMoney){
  for (var ref in arrayEquipment) {
   if (arrayEquipment.hasOwnProperty(ref)) {
        if (getSlug(arrayEquipment[ref][0]) === item.data.data.slug) return true;
    }
  }
  for (var ref in arrayWeapons) {
    if (arrayWeapons.hasOwnProperty(ref)) {
         if (getSlug(arrayWeapons[ref].name) === item.data.data.slug) return true;
     }
   }
   for (var ref in arrayArmor) {
    if (arrayArmor.hasOwnProperty(ref)) {
         if (getSlug(arrayArmor[ref].name) === item.data.data.slug) return true;
     }
   }
   for (var ref in arrayKit) {
    if (arrayKit.hasOwnProperty(ref)) {
        if (arrayKit[ref][0] === item.data.data.slug) return true;
     }
   }

   if (addMoney && (item.data.data.slug==="platinum-pieces" || item.data.data.slug==="gold-pieces" || item.data.data.slug==="silver-pieces" || item.data.data.slug==="copper-pieces")){
     return true;
   }
  return false;
}

function getClassAdjustedSpecialNameLowerCase(specialName){
  var name = specialName+" ("+jsonBuild.class+")";
  return name.toLowerCase();
}

function needsNewInstanceofFeat(targetActor, itemName, itemExtra){

  for (const existingItem of targetActor.data.items) {
    var displayName = itemName;
      if (itemExtra!=null)displayName +=" ("+itemExtra+")";
      if (existingItem.data.name===displayName)return false;
  }
  return true;
}
function needsNewInstanceofItem(targetActor, itemName){
  for (var ref in targetActor.data.items) {
    if (targetActor.data.items.hasOwnProperty(ref)) {
            if (targetActor.data.items[ref].name===itemName)return false;
    }         
 }
 return true;
}



function getSizeValue(size){
  switch(size) {
    case 0:
      return "tiny";
    case 1:
      return "sm";
    case 3:
      return "lg";
  }
  return "med";
}




/// spells

async function setSpellcasters(targetActor, arraySpellcasters, deleteAll){


  // delete existing spellcasters and spells if not already deleted
  if (!deleteAll){
    let items = targetActor.data.items.filter(i => i.type === "spellcastingEntry" || i.type === "spell");
    let deletions = items.map(i => i.id);
    let updated = await targetActor.deleteEmbeddedDocuments("Item", deletions); 

  }
  
   // make array of spellcaster instances. put 
   let requiredSpells=[];
    for (var ref in arraySpellcasters) {
        if (arraySpellcasters.hasOwnProperty(ref)) {
          let spellCaster = arraySpellcasters[ref];
          spellCaster.instance = await addSpecificCasterAndSpells(targetActor, spellCaster, spellCaster.magicTradition, spellCaster.spellcastingType);
          for (var ref in spellCaster.spells) {
            if (spellCaster.spells.hasOwnProperty(ref)) {
              let spellListObject = spellCaster.spells[ref];
              requiredSpells = requiredSpells.concat(spellListObject.list);
            }
          }
          
        }
    }

    finishedSpells=true;
    checkAllFinishedAndCreate(targetActor);
  
   game.packs.filter(pack => pack.metadata.name === 'spells-srd').forEach(async (pack) => {
    const content = await pack.getDocuments();
    for (const action of content.filter(item => spellIsRequired(item, requiredSpells))) {
      arraySpellcasters.forEach(spellCaster => {

        for (var ref in spellCaster.spells) {
          if (spellCaster.spells.hasOwnProperty(ref)) {

            let spellListObject = spellCaster.spells[ref];


            for (var ref in spellListObject.list) {
                if (spellListObject.list.hasOwnProperty(ref)) {
                    if (getSlug(spellListObject.list[ref])==action.data.data.slug){

                        const clonedData = JSON.parse(JSON.stringify(action.data));
                        clonedData.data.location.value = spellCaster.instance.id;
                        clonedData.data.level.value = spellListObject.spellLevel;

                        allItems.push(clonedData);

                        
                    }
                }         
             }
          }         
        }
       });
    }
    finishedSpells=true;
    checkAllFinishedAndCreate(targetActor);
  });

}



function spellIsRequired(item, arraySpells){
    for (var ref in arraySpells) {
        if (arraySpells.hasOwnProperty(ref)) {
            if (getSlug(arraySpells[ref])==item.data.data.slug)return true;
        }         
     }
  return false;
}

async function addSpecificCasterAndSpells(targetActor, spellCaster, magicTradition, spellcastingType){

  const spellcastingEntity = {
    ability: {
        type: 'String',
        label: 'Spellcasting Ability',
        value: spellCaster.ability,
    },
    focus: {
      pool: spellCaster.focusPoints,
    },
    proficiency: {
      value: spellCaster.proficiency/2,
    },
    spelldc: {
        type: 'String',
        label: 'Class DC',
        item: 0,
    },
    tradition: {
        type: 'String',
        label: 'Magic Tradition',
        value: magicTradition,
    },
    prepared: {
        type: 'String',
        label: 'Spellcasting Type',
        value: spellcastingType,
    },
    slots: {
      slot0: {
        max: spellCaster.perDay[0],
        prepared: [],
        value: 0

      },
      slot1: {
        max: spellCaster.perDay[1],
        prepared: [],
        value: 0
      },
      slot2: {
        max: spellCaster.perDay[2],
        prepared: [],
        value: 0
      },
      slot3: {
        max: spellCaster.perDay[3],
        prepared: [],
        value: 0
      },
      slot4: {
        max: spellCaster.perDay[4],
        prepared: [],
        value: 0
      },
      slot5: {
        max: spellCaster.perDay[5],
        prepared: [],
        value: 0
      },
      slot6: {
        max: spellCaster.perDay[6],
        prepared: [],
        value: 0
      },
      slot7: {
        max: spellCaster.perDay[7],
        prepared: [],
        value: 0
      },
      slot8: {
        max: spellCaster.perDay[8],
        prepared: [],
        value: 0
      },
      slot9: {
        max: spellCaster.perDay[9],
        prepared: [],
        value: 0
      },
      slot10: {
        max: spellCaster.perDay[10],
        prepared: [],
        value: 0
      },

    },
   
    showUnpreparedSpells: { value: true }
  };

  var fake=[];
  const data = {
    name: spellCaster.name,
    type: 'spellcastingEntry',
    data: spellcastingEntity
  };
  fake.push(data);


  let spellCasterInstance = await targetActor.createEmbeddedDocuments('Item', fake);
  return spellCasterInstance;
}

async function addLores(targetActor, arrayLores){

  const arrayLoreData = [];
  for (var ref in arrayLores) {
    if (arrayLores.hasOwnProperty(ref)) {
        let loreName = arrayLores[ref][0];
        let loreProf = arrayLores[ref][1];

        if (needsNewInstanceOfLore(targetActor, loreName)){

          const loreData = {
            proficient: {
                value: loreProf/2,
            },
            featType: "",
            mod: {
                value: 0
            },
            item: {
                value: 0
            }
  
          };
  
          const data = {
            name: loreName,
            type: 'lore',
            data: loreData,
          };
  
          arrayLoreData.push(data);
         

      


        } else {

          for (var ref in targetActor.data.items) {
            if (targetActor.data.items.hasOwnProperty(ref)) {
                if (targetActor.data.items[ref].name===loreName){
                  const update = {id: targetActor.data.items[ref].id, 'data.proficient.value': loreProf/2};
                  targetActor.updateEmbeddedEntity("Item", update); // Updates one EmbeddedEntity
                }
            }         
          }

        }

        

    }
  }
  if (arrayLoreData.length>0){
    targetActor.createEmbeddedDocuments('Item', arrayLoreData);
  }
}

function needsNewInstanceOfLore(targetActor, loreName){
  for (var ref in targetActor.data.items) {
    if (targetActor.data.items.hasOwnProperty(ref)) {
            if (targetActor.data.items[ref].name===loreName)return false;
    }         
  }
  return true;
}


function checkAllFinishedAndCreate(targetActor){

  if (finishedFeats && finishedEquipment && finishedSpells && finishedActions && finishedAncestryFeatures && finishedClassFeatures){
    let finished = targetActor.createEmbeddedDocuments("Item", allItems);
    if (finished){
      let notAddedCount=0;
      let warning = "<p>The following items could not be added. They may have already have been added in a previous import or cannot be matched to a foundry item. You may be able to find them with a manual search.</p><ul>";
      if (addEquipment){
        for (var ref in jsonBuild.equipment) {
          if (jsonBuild.equipment.hasOwnProperty(ref)) {
            var item = jsonBuild.equipment[ref];
            if (!item.added){
              notAddedCount++;
              warning+="<li>Equipment: "+item[0]+"</li>";
              //console.log("did not add "+item[0]);
            }
          }
        }
      }
      if (addFeats){
        for (var ref in jsonBuild.feats) {
          if (jsonBuild.feats.hasOwnProperty(ref)) {
            var item = jsonBuild.feats[ref];
            if (!addedItems.includes(item[0])){
              notAddedCount++;
              warning+="<li>Feat: "+item[0]+"</li>";
              //console.log("did not add "+item[0]);
            }
          }
        }

        for (var ref in jsonBuild.specials) {
          if (jsonBuild.specials.hasOwnProperty(ref)) {
            var item = jsonBuild.specials[ref];
            if (!addedItems.includes(item)){
              notAddedCount++;
              warning+="<li>Special: "+item+"</li>";
              //console.log("did not add "+item);
            }
          }
        }
      }
     
      warning+="</ul><br>";

      if (notAddedCount>0){

        new Dialog({
          title: `Pathbuilder Import Warning`,
          content: warning,
          buttons: {
            yes: {
              icon: "<i class='fas fa-check'></i>",
              label: `Finished`
            },
          },
          default: "yes",
          close: html => {}
        }).render(true);
      }
    }
  }
}

function getSlug(itemName){
  return itemName.toLowerCase()
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .replace(/\s+|-{2,}/g, '-');
}
function getFoundryFeatLocation(pathbuilderFeatType, pathbuilderFeatLevel){
  if (pathbuilderFeatType=="Ancestry Feat"){
    return "ancestry-"+pathbuilderFeatLevel;
  } else if (pathbuilderFeatType=="Class Feat"){
    return "class-"+pathbuilderFeatLevel;
  } else if (pathbuilderFeatType=="Skill Feat"){
    return "skill-"+pathbuilderFeatLevel;
  } else if (pathbuilderFeatType=="General Feat"){
    return "general-"+pathbuilderFeatLevel;
  }
  return null;
}
