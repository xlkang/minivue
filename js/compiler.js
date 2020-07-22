class Compiler {
  constructor (vm) {
    this.el = vm.$el
    this.vm = vm
    this.compile(this.el)
  }
  // 编译模板，处理文本节点和元素节点
  compile (el) {
    let childNodes = el.childNodes
    Array.from(childNodes).forEach(node => {
      // 处理文本节点
      if (this.isTextNode(node)) {
        this.compileText(node)
      } else if (this.isElementNode(node)) {
        // 处理元素节点
        this.compileElement(node)
      }

      // 判断node节点，是否有子节点，如果有子节点，要递归调用compile
      if (node.childNodes && node.childNodes.length) {
        this.compile(node)
      }
    })
  }
  // 编译元素节点，处理指令
  compileElement (node) {
    // console.log(node.attributes)
    // 遍历所有的属性节点
    Array.from(node.attributes).forEach(attr => {
      // 判断是否是指令
      let attrName = attr.name
      if (this.isDirective(attrName)) {
        // v-text --> text
        attrName = attrName.substr(2)
        let key = attr.value
        this.update(node, key, attrName)
      }
    })
  }

  update (node, key, attrName) {
    let prefix = '';
    const attrNameArr = attrName.split(':');

    // 解析v-on:eventName
    if(attrNameArr.length === 2){
      prefix = attrNameArr[0]
    } else {
      prefix = attrName
    }
    let updateFn = this[prefix + 'Updater']
    updateFn && updateFn.call(this, node, this.vm[key], key, attrNameArr[1])
  }

  // 处理 v-text 指令
  textUpdater (node, value, key) {
    node.textContent = value
    new Watcher(this.vm, key, (newValue) => {
      node.textContent = newValue
    })
  }
  // v-model
  modelUpdater (node, value, key) {
    node.value = value
    new Watcher(this.vm, key, (newValue) => {
      node.value = newValue
    })
    // 双向绑定
    node.addEventListener('input', () => {
      this.vm[key] = node.value
    });
  }

  // 处理 v-on 指令
  onUpdater (node, value, key, eventName) {
    // 取出对应的callback
    const cb = this.vm.$options.methods[key]
    if(!cb) console.log(`cant find function ${key}`)
    // 注册到真实节点上并且绑定this到vue实例上
    node.addEventListener(eventName, cb.bind(this.vm))
  }

  // 处理 v-html 指令
  htmlUpdater (node, value, key) {
    // 创建新节点
    const newNode = this.createNode(value);
    
    // 替换节点
    // 将新节点插入到旧节点前
    node.parentNode.insertBefore(newNode, node);
    // 移除旧节点
    node.parentNode.removeChild(node)
  }

  // 根据html字符串创建node
  createNode(txt) {
    const template = `<div class='child'>${txt}</div>`;
    let tempNode = document.createElement('div');
    tempNode.innerHTML = template;
    return tempNode.firstChild;
  }

  // 编译文本节点，处理差值表达式
  compileText (node) {
    // console.dir(node)
    // {{  msg }}
    let reg = /\{\{(.+?)\}\}/
    let value = node.textContent
    if (reg.test(value)) {
      let key = RegExp.$1.trim()
      node.textContent = value.replace(reg, this.vm[key])

      // 创建watcher对象，当数据改变更新视图
      new Watcher(this.vm, key, (newValue) => {
        node.textContent = newValue
      })
    }
  }

  // 判断元素属性是否是指令
  isDirective (attrName) {
    return attrName.startsWith('v-')
  }
  // 判断节点是否是文本节点
  isTextNode (node) {
    return node.nodeType === 3
  }
  // 判断节点是否是元素节点
  isElementNode (node) {
    return node.nodeType === 1
  }
}