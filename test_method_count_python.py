"""
Archivo de prueba para demostrar el funcionamiento de MethodCountMetricPython
Este archivo contiene varios tipos de funciones y métodos en Python
"""

# Función simple
def simple_function():
    return "Hello World"

# Función con parámetros
def function_with_params(param1, param2="default"):
    return param1 + param2

# Función async
async def async_function():
    await some_operation()
    return "Async result"

# Función con anotaciones de tipo
def typed_function(name: str, age: int) -> str:
    return f"{name} is {age} years old"

# Función con parámetros complejos
def complex_params(*args, **kwargs):
    return args, kwargs

class TestClass:
    """Clase de prueba con varios métodos"""
    
    def __init__(self, value: int = 0):
        self.value = value
    
    def regular_method(self):
        return self.value
    
    @staticmethod
    def static_method():
        return "Static method result"
    
    @classmethod
    def class_method(cls):
        return cls()
    
    @property
    def value_property(self):
        return self._value
    
    @value_property.setter
    def value_property(self, val):
        self._value = val
    
    async def async_method(self):
        result = await some_async_operation()
        return result

# Función con función anidada
def outer_function():
    def inner_function():
        return "Inner result"
    
    return inner_function()

# Función con múltiples decoradores
@decorator1
@decorator2
def decorated_function():
    return "Decorated result"

# Esto no debería contarse como función (es una llamada)
result = simple_function()

# Esto tampoco debería contarse (es un lambda)
lambda_func = lambda x: x * 2

# String que contiene código que parece función (no debería contarse)
code_string = """
def fake_function():
    pass
"""

# Comentario con función (no debería contarse)
# def comment_function(): pass

'''
Comentario multilínea con función (no debería contarse)
def multiline_comment_function():
    return "fake"
'''
