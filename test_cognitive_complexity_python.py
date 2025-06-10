# Archivo de prueba para demostrar la complejidad cognitiva en Python

def simple_function():
    """Función simple con baja complejidad"""
    return "Hello World"

def moderate_complexity(data):
    """Función con complejidad moderada"""
    if not data:
        return []
    
    results = []
    for item in data:
        if item.get("active"):
            results.append(item)
    
    return results

def high_complexity_function(items):
    """Función con alta complejidad cognitiva"""
    if not items:
        raise ValueError("No items provided")
    
    processed = []
    errors = []
    
    for item in items:
        try:
            if item.get("type") == "user":
                if item.get("active", False):
                    user_data = process_user(item)
                    if user_data and user_data.get("valid"):
                        processed.append(user_data)
                    else:
                        continue
                else:
                    inactive_users.append(item)
            elif item.get("type") == "product":
                product_data = [p for p in item.get("products", []) if p.get("available")]
                if product_data:
                    processed.extend(product_data)
        except Exception as e:
            if should_retry(e):
                retry_queue.append(item)
            else:
                errors.append({"item": item, "error": str(e)})
    
    return processed if processed else None

def lambda_and_comprehension_example():
    """Función que demuestra lambdas y comprehensions"""
    # Lambdas simples
    square = lambda x: x ** 2
    
    # Lambda anidada
    nested_lambda = lambda x: lambda y: x + y
    
    # Comprehensions simples
    squares = [x**2 for x in range(10)]
    even_squares = [x**2 for x in range(10) if x % 2 == 0]
    
    # Comprehension anidada
    matrix = [[i*j for j in range(3)] for i in range(3)]
    
    # Comprehension con condiciones complejas
    filtered_data = [
        item.value for item in data_list 
        if item.is_valid and item.value > threshold and item.status == "active"
    ]
    
    # Uso de lambda con map/filter
    processed = list(map(lambda x: x * 2 if x > 0 else 0, numbers))
    
    return {
        "squares": squares,
        "matrix": matrix,
        "filtered": filtered_data,
        "processed": processed
    }

def generator_example():
    """Función que demuestra generadores y yield"""
    for i in range(100):
        if i % 2 == 0:
            if i % 4 == 0:
                yield i * 2
            else:
                yield i
        else:
            if i % 3 == 0:
                yield from other_generator(i)
            else:
                continue

def exception_handling_example():
    """Función que demuestra manejo complejo de excepciones"""
    try:
        risky_operation()
    except ValueError as e:
        if e.args and len(e.args) > 0:
            log_error(e)
            if should_retry_value_error(e):
                return retry_operation()
        return None
    except (TypeError, AttributeError) as e:
        log_error(e)
        return default_value()
    except Exception as e:
        if is_critical_error(e):
            raise
        else:
            log_warning(e)
            return fallback_value()
    finally:
        cleanup_resources()
    
    return success_value()

class ComplexDataProcessor:
    """Clase que demuestra diferentes niveles de complejidad"""
    
    def __init__(self, config):
        self.config = config
        self.cache = {}
    
    def simple_method(self):
        """Método simple"""
        return self.config.get("value", 0)
    
    def moderate_method(self, data):
        """Método con complejidad moderada"""
        if not data:
            return []
        
        results = []
        for item in data:
            if self.validate_item(item):
                processed = self.process_item(item)
                if processed:
                    results.append(processed)
        
        return results
    
    def complex_method(self, items):
        """Método con alta complejidad"""
        if not items:
            return None
        
        try:
            processed_items = []
            
            for item in items:
                if item.get("id") in self.cache:
                    cached_result = self.cache[item["id"]]
                    if cached_result.get("valid"):
                        processed_items.append(cached_result)
                        continue
                
                if item.get("type") == "priority":
                    try:
                        result = self.process_priority_item(item)
                        if result and result.get("success"):
                            self.cache[item["id"]] = result
                            processed_items.append(result)
                        else:
                            self.handle_failed_item(item)
                    except Exception as e:
                        if self.should_retry_error(e):
                            self.add_to_retry_queue(item)
                        else:
                            self.log_error(item, e)
                elif item.get("type") == "batch":
                    batch_results = [
                        self.process_single_item(sub_item) 
                        for sub_item in item.get("items", [])
                        if sub_item.get("enabled", True)
                    ]
                    if batch_results:
                        processed_items.extend(batch_results)
                else:
                    # Tipo desconocido
                    self.log_warning(f"Unknown item type: {item.get('type')}")
            
            return processed_items if processed_items else []
            
        except Exception as e:
            self.log_error({"operation": "complex_method"}, e)
            raise

# Ejemplo de función con complejidad extrema
def ultimate_complexity_example(data, config, options=None):
    """
    Función que combina múltiples patrones de complejidad cognitiva.
    Esta función debería tener una complejidad muy alta.
    """
    if not data or not config:
        raise ValueError("Data and config are required")
    
    options = options or {}
    results = []
    errors = []
    cache = {}
    
    try:
        # Procesamiento principal con múltiples niveles de anidamiento
        for batch_idx, batch in enumerate(data):
            if not batch or not isinstance(batch, (list, tuple)):
                continue
            
            batch_results = []
            
            for item_idx, item in enumerate(batch):
                try:
                    # Validación compleja con operadores lógicos
                    if (item.get("enabled", True) and 
                        item.get("status") != "disabled" and
                        (item.get("priority", 0) > 0 or item.get("force", False))):
                        
                        # Procesamiento basado en tipo con múltiples ramas
                        if item.get("type") == "user":
                            if item.get("role") == "admin":
                                admin_result = process_admin_user(item)
                                if admin_result and admin_result.get("valid"):
                                    batch_results.append(admin_result)
                                elif admin_result and admin_result.get("retry"):
                                    # Lambda para procesamiento de retry
                                    retry_func = lambda x: process_retry_user(x) if x.get("attempts", 0) < 3 else None
                                    retry_result = retry_func(item)
                                    if retry_result:
                                        batch_results.append(retry_result)
                                else:
                                    errors.append({"type": "admin_processing", "item": item})
                            elif item.get("role") == "user":
                                # Comprehension anidada para procesamiento de usuario
                                user_data = {
                                    "processed": [
                                        process_user_field(field, value)
                                        for field, value in item.items()
                                        if field not in ["password", "secret"] and value is not None
                                    ],
                                    "metadata": {
                                        key: [
                                            transform_meta_value(v) for v in values
                                            if v.get("active", True)
                                        ]
                                        for key, values in item.get("metadata", {}).items()
                                        if isinstance(values, list)
                                    }
                                }
                                
                                if user_data["processed"]:
                                    batch_results.append(user_data)
                            else:
                                # Rol desconocido
                                log_warning(f"Unknown user role: {item.get('role')}")
                                
                        elif item.get("type") == "product":
                            # Procesamiento de productos
                            product_id = item.get("id")
                            if product_id in cache:
                                cached_product = cache[product_id]
                                if cached_product.get("valid") and not cached_product.get("expired"):
                                    batch_results.append(cached_product)
                                    continue
                            
                            try:
                                product_result = process_product(item)
                                if product_result:
                                    # Validación compleja del producto
                                    if (product_result.get("price", 0) > 0 and
                                        product_result.get("stock", 0) >= 0 and
                                        product_result.get("category") in config.get("allowed_categories", [])):
                                        
                                        cache[product_id] = product_result
                                        batch_results.append(product_result)
                                    else:
                                        errors.append({
                                            "type": "product_validation",
                                            "item": item,
                                            "result": product_result
                                        })
                                else:
                                    errors.append({"type": "product_processing", "item": item})
                                    
                            except Exception as product_error:
                                if isinstance(product_error, (ValueError, TypeError)):
                                    if should_retry_product_error(product_error):
                                        retry_queue.append(item)
                                    else:
                                        errors.append({
                                            "type": "product_error",
                                            "item": item,
                                            "error": str(product_error)
                                        })
                                else:
                                    # Error crítico, re-lanzar
                                    raise
                                    
                        elif item.get("type") == "order":
                            # Procesamiento de órdenes con generadores
                            order_items = item.get("items", [])
                            if order_items:
                                # Generator expression para procesar items de orden
                                processed_order_items = (
                                    process_order_item(order_item)
                                    for order_item in order_items
                                    if order_item.get("quantity", 0) > 0 and order_item.get("product_id")
                                )
                                
                                valid_items = []
                                for processed_item in processed_order_items:
                                    if processed_item and processed_item.get("valid"):
                                        valid_items.append(processed_item)
                                    elif processed_item and processed_item.get("warning"):
                                        log_warning(f"Order item warning: {processed_item.get('warning')}")
                                        valid_items.append(processed_item)
                                    else:
                                        errors.append({
                                            "type": "order_item_processing",
                                            "item": order_item
                                        })
                                
                                if valid_items:
                                    order_result = {
                                        "order_id": item.get("id"),
                                        "items": valid_items,
                                        "total": sum(
                                            item.get("price", 0) * item.get("quantity", 0)
                                            for item in valid_items
                                            if item.get("price") and item.get("quantity")
                                        )
                                    }
                                    batch_results.append(order_result)
                            else:
                                errors.append({"type": "empty_order", "item": item})
                        else:
                            # Tipo desconocido
                            log_warning(f"Unknown item type: {item.get('type')}")
                            
                    else:
                        # Item no habilitado o no válido
                        if options.get("log_skipped", False):
                            log_info(f"Skipped item {item_idx} in batch {batch_idx}")
                            
                except Exception as item_error:
                    # Manejo de errores a nivel de item
                    if isinstance(item_error, KeyboardInterrupt):
                        # Interrupción del usuario, salir inmediatamente
                        raise
                    elif isinstance(item_error, MemoryError):
                        # Error de memoria, limpiar cache y continuar
                        cache.clear()
                        log_error(f"Memory error processing item {item_idx}, cleared cache")
                        continue
                    else:
                        # Otros errores
                        errors.append({
                            "type": "item_processing_error",
                            "batch_idx": batch_idx,
                            "item_idx": item_idx,
                            "error": str(item_error)
                        })
                        
                        if len(errors) > config.get("max_errors", 100):
                            raise RuntimeError(f"Too many errors: {len(errors)}")
            
            # Agregar resultados del batch si hay alguno
            if batch_results:
                results.extend(batch_results)
            elif options.get("require_batch_results", False):
                raise ValueError(f"No results for batch {batch_idx}")
                
    except Exception as processing_error:
        # Manejo de errores a nivel de procesamiento principal
        if isinstance(processing_error, (KeyboardInterrupt, SystemExit)):
            # Errores críticos del sistema
            raise
        else:
            # Otros errores de procesamiento
            log_error(f"Processing error: {processing_error}")
            if options.get("fail_on_error", True):
                raise
            else:
                # Continuar con resultados parciales
                log_warning("Continuing with partial results due to processing error")
                
    finally:
        # Limpieza final
        if cache:
            cache.clear()
        log_info(f"Processing completed with {len(results)} results and {len(errors)} errors")
    
    return {
        "results": results,
        "errors": errors,
        "summary": {
            "total_results": len(results),
            "total_errors": len(errors),
            "success_rate": len(results) / (len(results) + len(errors)) if (len(results) + len(errors)) > 0 else 0
        }
    }

if __name__ == "__main__":
    print("Este archivo demuestra diferentes niveles de complejidad cognitiva en Python")
    print("Úsalo con la extensión Chontaduro Labeler para ver las métricas de complejidad")
