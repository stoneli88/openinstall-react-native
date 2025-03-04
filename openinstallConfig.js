
var fs = require('fs');
var spath = require('path');
var os = require('os');

//读取传入的appkey和schema
var appKey = process.argv[2];
if(appKey == undefined || appKey == null){
	console.log("没有输入 appKey 参数");
	return;
}

var schema = process.argv[3];
if(schema == undefined || schema == null){
	console.log("没有输入 schema 参数,默认使用 appkey");
	schema = appKey;
}

console.log("\n------------  开始自动配置  ------------");
console.log("---  如自动配置失败，请使用手动配置  ---\n");

////////////////  ios配置 ///////////////////
//导入头文件
function importHeaderFile(path){
	var rf = fs.readFileSync(path,"utf-8");
	// 插入 头文件
	var hasImport = rf.match(/RCTOpenInstall.h/);
	if (hasImport != null) {
		return
	}
	rf = rf.replace("#import <UIKit/UIKit.h>","#import <UIKit/UIKit.h>\n#import <RCTOpenInstall/RCTOpenInstall.h>");
	fs.writeFileSync(path, rf, "utf-8");

	console.log(path + " 头文件导入成功\n");
}
//编写代码
function codeAppDelegate(path){
	var err = false;
	var rf = fs.readFileSync(path,"utf-8");
	var matchFinishLaunching = rf.match(/\n.*didFinishLaunchingWithOptions.*\n?\{/);
	if(matchFinishLaunching != null){
		var hasCoded = rf.match(/OpenInstallSDK initWithDelegate/);
		if(hasCoded == null){
			rf = rf.replace(matchFinishLaunching[0], matchFinishLaunching[0] + "\n\t" 
			+ "[OpenInstallSDK initWithDelegate:[RCTOpenInstall allocWithZone:nil]];");
		}
	}else{
		console.log("没有匹配到 didFinishLaunchingWithOptions");
		err = true;
	}
	var matchOpenURL1 = rf.match(/\n.*openURL.*options.*\n?\{/);
	if(matchOpenURL1 == null){
		//rf = rf.replace("@end","- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options{" 
		//+ "\n\t\/\/openURL1"
		//+ "\n\t[OpenInstallSDK handLinkURL:url];\n\treturn YES;\n}" 
		//+ "\n@end");
	}else{
		var hasCoded = rf.match(/openURL1\n.*OpenInstallSDK handLinkURL/);
		if(hasCoded == null){
			rf = rf.replace(matchOpenURL1[0], matchOpenURL1[0] 
			+ "\n\t\/\/openURL1"
			+ "\n\t[OpenInstallSDK handLinkURL:url];");
		}
	}
	var matchOpenURL2 = rf.match(/\n.*openURL.*sourceApplication.*\n?\{/);
	if(matchOpenURL2 == null){
		rf = rf.replace("@end","- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url sourceApplication:(NSString *)sourceApplication annotation:(id)annotation{"
		+ "\n\t\/\/openURL2"
		+ "\n\t[OpenInstallSDK handLinkURL:url];\n\treturn YES;\n}"
		+ "\n@end");
	}else{
		var hasCoded = rf.match(/openURL2\n.*OpenInstallSDK handLinkURL/);
		if(hasCoded == null){
			rf = rf.replace(matchOpenURL2[0], matchOpenURL2[0] 
			+ "\n\t\/\/openURL2"
			+ "\n\t[OpenInstallSDK handLinkURL:url];");
		}
	}
	
	var matchContinueUserActivity = rf.match(/\n.*continueUserActivity.*\n?\{/);
	if(matchContinueUserActivity == null){
		rf = rf.replace("@end","- (BOOL)application:(UIApplication *)application continueUserActivity:(NSUserActivity *)userActivity restorationHandler:(void (^)(NSArray * _Nullable))restorationHandler{"
		+ "\n\t[OpenInstallSDK continueUserActivity:userActivity];"
		+ "\n\treturn YES;\n}"
		+ "\n@end");
	}else{
		var hasCoded = rf.match(/OpenInstallSDK continueUserActivity/);
		if(hasCoded == null){
			rf = rf.replace(matchContinueUserActivity[0], matchContinueUserActivity[0] + "\n\t" 
			+ "[OpenInstallSDK continueUserActivity:userActivity];");
		}
	}
	
	fs.writeFileSync(path, rf, "utf-8");
	if(err){
		console.error(path + " 配置有问题，请参考文档手动修改\n");
	}else{
		console.log(path + " 修改成功\n");
	}
	
}
//配置plist文件
function writePlist(path){
	var rf = fs.readFileSync(path,"utf-8");
	var matchStart = rf.match(/<plist .*>\n?<dict>/);
	if(matchStart == null){
		return;
	}
	var codeAppkey = rf.match(/<key>com.openinstall.APP_KEY<\/key>/);
	if(codeAppkey == null){
		rf = rf.replace(matchStart[0], matchStart[0] 
		+ "\n\t<key>com.openinstall.APP_KEY</key>"
		+ "\n\t<string>" + appKey + "</string>");
	}else{
		console.log("iOS平台appkey已配置，如需修改请手动配置");
	}
	var codeScheme = rf.match(/<key>CFBundleURLName<\/key>\s*<string>openinstall<\/string>/);
	if(codeScheme == null){
		var matchBundleURL = rf.match(/<key>CFBundleURLTypes<\/key>\s*<array>/);
		if(matchBundleURL == null){
			rf = rf.replace(matchStart[0], matchStart[0]
			+ "\n\t<key>CFBundleURLTypes</key>\n\t<array>\n\t\t<dict>"
			+ "\n\t\t\t<key>CFBundleTypeRole</key>\n\t\t\t<string>Editor</string>"
			+ "\n\t\t\t<key>CFBundleURLName</key>\n\t\t\t<string>openinstall</string>"
			+ "\n\t\t\t<key>CFBundleURLSchemes</key>\n\t\t\t<array>\n\t\t\t\t<string>" + schema + "</string>\n\t\t\t</array>"
			+ "\n\t\t</dict>\n\t</array>");
		}else{
			rf = rf.replace(matchBundleURL[0], matchBundleURL[0]
			+ "\n\t\t<dict>"
			+ "\n\t\t\t<key>CFBundleTypeRole</key>\n\t\t\t<string>Editor</string>"
			+ "\n\t\t\t<key>CFBundleURLName</key>\n\t\t\t<string>openinstall</string>"
			+ "\n\t\t\t<key>CFBundleURLSchemes</key>\n\t\t\t<array>\n\t\t\t\t<string>" + schema + "</string>\n\t\t\t</array>"
			+ "\n\t\t</dict>");
		}
	}else{
		console.log("iOS平台scheme已配置，如需修改请手动配置");
	}
	fs.writeFileSync(path, rf, "utf-8");

	console.log(path + " 配置完成\n");
}

var projectName;
// find Project Dir
traversalFile(spath.resolve("./ios"), 1, function(f, s){
	var xcodeproj = (/(\S+)?\.xcodeproj/im).exec(f);
	if(xcodeproj != null){
		projectName = xcodeproj[1];
	}
})
//遍历ios工程目录
traversalFile(projectName?projectName:spath.resolve("./ios/"), 10, function(f, s){
	var AppDelegateHeader = f.match(/AppDelegate\.h/);
	if (AppDelegateHeader != null) {
		// console.log("find AppDelegate.h: " + f);
		importHeaderFile(f);
	}
	var AppDelegateFile = f.match(/AppDelegate\.m/);
	if (AppDelegateFile != null) {
		// console.log("find AppDelegate.m : "+f);
		codeAppDelegate(f);
	}
	var plistFile = f.match(/Info\.plist/);
	if(plistFile != null){
		// console.log("find Info.plist: "+f);
		writePlist(f);
	}
})

////////////////  Android配置  ///////////////
//配置AndroidManifest.xml中的appkey和scheme
function configManifestXml(path){
	var err = false;
	var rf = fs.readFileSync(path, "utf-8");
	var alreadyConfigAppkey = rf.match(/com.openinstall.APP_KEY/);
	if(alreadyConfigAppkey == null){
		var matchApplication = rf.match(/\n.*<\/application>/);
		if(matchApplication != null){
			rf = rf.replace(matchApplication[0], "\n\t\t<meta-data " 
			+ "\n\t\t\tandroid:name=\"com.openinstall.APP_KEY\"" 
			+ "\n\t\t\tandroid:value=\"" + appKey + "\"/>" 
			+ matchApplication[0]);
		}else{
			console.log("没有匹配到 </application>");
			err = true;
		}
	}else{
		console.log("Android平台appkey已配置，如需修改请手动配置");
	}
	var alreadyConfigScheme = rf.match(/<!-- openinstall scheme -->/);
	if(alreadyConfigScheme == null){
		var matchLauncherIntent = rf.match(/\n.*<intent-filter>\n.*android.intent.action.MAIN.*\n.*android.intent.category.LAUNCHER.*\n.*<\/intent-filter>/);
		if(matchLauncherIntent != null){
			rf = rf.replace(matchLauncherIntent[0], matchLauncherIntent[0]
			+ "\n\t\t\t<!-- openinstall scheme -->"
			+ "\n\t\t\t<intent-filter>"
			+ "\n\t\t\t\t<action android:name=\"android.intent.action.VIEW\"/>"
			+ "\n\t\t\t\t<category android:name=\"android.intent.category.DEFAULT\"/>"
			+ "\n\t\t\t\t<category android:name=\"android.intent.category.BROWSABLE\"/>"
			+ "\n\t\t\t\t<data android:scheme=\"" + schema + "\"/>"
			+ "\n\t\t\t</intent-filter>");
		}else{
			console.log("没有匹配到 LAUNCHER intent-filter");
			err =true;
		}
	}else{
		console.log("Android平台scheme已配置，如需修改请手动配置");
	}
	fs.writeFileSync(path, rf, "utf-8");

	if(err){
		console.error(path + " 配置有问题，请参考文档手动修改\n");
	}else{
		console.log(path + " 配置完成\n");
	}
}
//配置app/build.gradle
function configBuildGradle(path){
	var err = false;
	var rf = fs.readFileSync(path, "utf-8");
	var alreadyConfig = rf.match(/.*openinstall-react-native.*/);
	if(alreadyConfig == null){
		var matchDepend = rf.match(/\n.*dependencies {\n/);
		if(matchDepend != null){
			rf = rf.replace(matchDepend[0], matchDepend[0] 
			+ "\n\timplementation project(\":openinstall-react-native\")\n");
		}else{
			console.log("没有匹配到 dependencies");
			err = true;
		}
	}

	if(err){
		console.error(path + " 导入依赖失败，请参考日志手动修改\n");
	}else{
		fs.writeFileSync(path, rf, "utf-8");
		console.log(path + " 导入依赖成功\n");
	}
	
}
//配置settings.gradle
function configSettingsGradle(path){
	var err = false;
	var rf = fs.readFileSync(path, "utf-8");
	var alreadyConfig = rf.match(/.*openinstall-react-native.*/);
	if(alreadyConfig == null){
		var matchInclude = rf.match(/\n.*include.*':app'/);
		if(matchInclude != null){
			rf = rf.replace(matchInclude[0], "\nproject(':openinstall-react-native').projectDir = "
			+ "new File(rootProject.projectDir, '../node_modules/openinstall-react-native/android')" 
			+ matchInclude[0] + ", ':openinstall-react-native'");
		}else{
			cosole.log("没有匹配到 include ':app'");
			err = true;
		}
	}

	if(err){
		console.error(path + " 配置module失败，请参考日志手动修改\n");
	}else{
		fs.writeFileSync(path, rf, "utf-8");
		console.log(path + " 配置module成功\n");
	}

}

//遍历项目根目录查找 settings.gradle
traversalFile(spath.resolve("./android/"), 1, function(f, s){
	var settingsGradle = f.match(/settings\.gradle/);
	if(settingsGradle != null){
		// console.log("find settings.gradle : " + f);
		configSettingsGradle(f);
	}
});
//遍历 app module
traversalFile(spath.resolve("./android/app/"), 10, function(f, s){
	var manifestXml = f.match(/AndroidManifest\.xml/);
	if(manifestXml != null){
		//排除掉build目录
		if(f.match(/\\build\\/) != null){
			return;
		}
		// console.log("find AndroidManifest.xml : " + f);
		configManifestXml(f);
	}
	var buildGradle = f.match(/build\.gradle/);
	if(buildGradle != null){
		// console.log("find build.gradle : " + f);
		configBuildGradle(f);
	}
});

console.log("\n------------  完成自动配置  ------------");

//////////////////////////////////////////////
function traversalFile(file, deep, handler){
	var stats = fs.statSync(file);
	handler(file, stats);

	// 遍历子目录
	if (deep > 0 &&　stats.isDirectory()) {
		var files = fullPath(file, fs.readdirSync(file));
		deep = deep-1;
		files.forEach(function (f) {
		  traversalFile(f, deep, handler);
		});
	}
}

function fullPath(dir, files) {
  return files.map(function (f) {
    return spath.join(dir, f);
  });
}
