import { useState } from 'react'
const { ResizeObserver } = window

const getElementPosition = elem => {
  const rect = elem.getBoundingClientRect()
  return {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width,
    x: rect.x,
    y: rect.y,
    offsetTop: elem.offsetTop,
    offsetLeft: elem.offsetLeft,
  }
}

const nextFrameSubs = new Set()
const callAllFrameSubs = () => {
  for (const sub of nextFrameSubs) {
    sub()
  }
}

let RAFId
const afterNextFrame = sub => {
  if (!nextFrameSubs.size) {
    nextFrameLoop()
  }
  nextFrameSubs.add(sub)
  return () => {
    nextFrameSubs.delete(sub)
    if (!nextFrameSubs.size) {
      cancelAnimationFrame(RAFId)
    }
  }
}

const nextFrameLoop = () => {
  setTimeout(callAllFrameSubs, 0)
  RAFId = requestAnimationFrame(nextFrameLoop)
}

const observeElem = (observers, elem, initialState) => {
  const cachedObserver = observers.get(elem)
  if (cachedObserver) return cachedObserver
  const newObserver = { state: initialState, callbacks: new Set() }
  observers.set(elem, newObserver)
  return newObserver
}

const triggerCallbacks = (callbacks, newState) => {
  for (const cb of callbacks) {
    cb(newState)
  }
}

const observeDOM = (getter, hasChanged) => {
  const observers = new Map()
  let unsub
  const sub = () => {
    for (const [elem, observer] of observers) {
      const newState = getter(elem)
      if (hasChanged(newState, observer.state)) {
        observer.state = newState
        setTimeout(triggerCallbacks, 0, observer.callbacks, newState)
      }
    }
  }

  return (elem, callback, initialState) => {
    if (!observers.size) {
      unsub = afterNextFrame(sub)
    }
    const observe = observeElem(observers, elem, initialState)
    observe.callbacks.add(callback)
    return () => {
      observe.callbacks.delete(callback)
      if (!observe.callbacks.size) {
        observers.delete(elem)
        if (!observers.size) {
          unsub()
        }
      }
    }
  }
}

const keys = [
  'width',
  'height',
  'top',
  'right',
  'bottom',
  'left',
  'offsetTop',
  'offsetLeft',
]
const observeRect = observeDOM(
  elem => getElementPosition(elem),
  (a, b) => {
    let i = -1
    if (a && !b) return true
    while (++i < keys.length) {
      const key = keys[i]
      if (a[key] !== b[key]) return true
    }
    return false
  },
)

const useElementPositionALaMano = callback => elem => observeRect(elem, callback)

export const useElementPositionCallback = useElementPositionALaMano

export const useElementPosition = defaultValue => {
  const [rect, setRect] = useState(defaultValue)
  const ref = elem => observeRect(elem, setRect)
  return [ref, rect]
}

export const WithPosition = ({ children, ...props }) => {
  const [ref, rect] = useElementPosition({
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    offsetTop: 0,
    offsetLeft: 0,
  })

  return React.createElement(
    'div',
    { ref, ...props },
    React.Children.map(children, child => React.cloneElement(child, rect)),
  )
}
